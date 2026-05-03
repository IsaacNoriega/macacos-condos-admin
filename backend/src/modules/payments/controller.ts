import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as paymentsService from './service';
import Charge from '../charges/model';
import User from '../users/model';
import * as residentsService from '../residents/service';
import {
  deletePaymentProofBlob,
  getPaymentProofSasUrl,
  resolveOwnedProofBlobName,
  uploadPaymentProofToAzure,
} from '../../config/azureBlob';

const DEFAULT_LATE_FEE_PER_DAY = Number(process.env.LATE_FEE_PER_DAY || '10');
const DAY_MS = 24 * 60 * 60 * 1000;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const resolveChargeTotal = (charge: { amount: number; dueDate: Date; lateFeePerDay?: number }, now = new Date()) => {
  const baseAmount = Number(charge.amount || 0);
  const dueDate = new Date(charge.dueDate);
  const lateFeePerDay = Number(charge.lateFeePerDay ?? DEFAULT_LATE_FEE_PER_DAY);

  if (Number.isNaN(dueDate.getTime()) || now.getTime() <= dueDate.getTime()) {
    return {
      baseAmount: roundMoney(baseAmount),
      lateFeePerDay: roundMoney(Math.max(0, lateFeePerDay)),
      daysOverdue: 0,
      lateFeeAmount: 0,
      totalAmount: roundMoney(baseAmount),
    };
  }

  const daysOverdue = Math.max(1, Math.ceil((now.getTime() - dueDate.getTime()) / DAY_MS));
  const lateFeeAmount = roundMoney(daysOverdue * Math.max(0, lateFeePerDay));

  return {
    baseAmount: roundMoney(baseAmount),
    lateFeePerDay: roundMoney(Math.max(0, lateFeePerDay)),
    daysOverdue,
    lateFeeAmount,
    totalAmount: roundMoney(baseAmount + lateFeeAmount),
  };
};

const getChargeForPayment = async (chargeId: string, tenantId: string) => {
  const charge = await Charge.findOne({ _id: chargeId, tenantId });

  if (!charge) {
    throw new AppError('Cargo no encontrado', 404);
  }

  if (charge.isPaid) {
    throw new AppError('El cargo ya fue pagado', 400);
  }

  return charge;
};

const markChargeAsPaid = async (chargeId: string, tenantId: string) => {
  const result = await Charge.updateOne({ _id: chargeId, tenantId }, { isPaid: true });
  logger.log('payments.markChargeAsPaid', 'system', tenantId, { chargeId, modifiedCount: result.modifiedCount });
};

const normalizeStripeCheckoutUrl = (baseUrl: string, mode: 'success' | 'cancel') => {
  const sessionPlaceholder = '{CHECKOUT_SESSION_ID}';

  try {
    const parsed = new URL(baseUrl);
    // Normalizar rutas antiguas si vienen del .env
    if (parsed.pathname === '/pagos/exito' || parsed.pathname === '/pagos/cancelado') {
      parsed.pathname = '/payments';
    }

    // Agregar parámetros si faltan
    if (!parsed.searchParams.has('stripe')) {
      parsed.searchParams.set('stripe', mode);
    }

    if (mode === 'success' && !parsed.searchParams.has('session_id')) {
      // Usamos un marcador temporal para evitar que URL() codifique las llaves {}
      parsed.searchParams.set('session_id', 'STRIPE_ID_HINT');
      return parsed.toString().replace('STRIPE_ID_HINT', sessionPlaceholder);
    }

    return parsed.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    if (mode === 'cancel') {
      return `${baseUrl}${separator}stripe=cancel`;
    }
    // Si falla el parseo, lo hacemos manualmente para asegurar que el placeholder no se codifique
    if (baseUrl.includes(sessionPlaceholder)) return baseUrl;
    return `${baseUrl}${separator}session_id=${sessionPlaceholder}&stripe=success`;
  }
};

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError('STRIPE_SECRET_KEY no configurado', 500);
  }

  return new Stripe(secretKey);
};

export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: queryTenantId } = req.query;
    const role = req.user?.role;
    let payments;

    if (role === 'superadmin') {
      payments = queryTenantId
        ? await paymentsService.findPaymentsByTenant(String(queryTenantId))
        : await paymentsService.findAllPayments();
    } else if (role === 'residente' || role === 'familiar') {
      let email = req.user.email;
      if (!email && req.user.id) {
        const u = await User.findById(req.user.id).select('email').lean();
        email = u?.email;
      }
      
      const userUnits = await residentsService.findUnitsByUserEmail(email || '', req.tenantId);
      const unitIds = userUnits.map(u => String(u.unitId));
      const callerId = req.user?.id ? String(req.user.id) : '';
      
      const tenantPayments = await paymentsService.findPaymentsByTenant(req.tenantId);
      payments = tenantPayments.filter((payment) => 
        String(payment.userId?._id || payment.userId) === callerId || (payment.unitId && unitIds.includes(String(payment.unitId)))
      );
    } else {
      payments = await paymentsService.findPaymentsByTenant(req.tenantId);
    }

    res.json({ success: true, payments });
  } catch (err: unknown) {
    next(new AppError('Error al obtener pagos', 500, { cause: toError(err).message }));
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  // If we validated the uploaded proof and then the persist step fails,
  // we remove the blob so a retry doesn't pile up orphaned files in
  // Azure. Tracked outside the try so the catch block can reach it.
  let blobToCleanupOnFailure: string | undefined;

  try {
    const {
      tenantId: requestedTenantId,
      unitId,
      userId,
      chargeId,
      currency,
      provider,
      proofOfPaymentUrl,
    } = req.body;
    const userRole = req.user?.role;
    const targetTenantId = userRole === 'superadmin' && requestedTenantId ? String(requestedTenantId) : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    // Validar acceso según rol
    if (userRole === 'superadmin') {
      // SuperAdmin puede seleccionar cualquier tenant, unidad y usuario
      if (!requestedTenantId) {
        throw new AppError('SuperAdmin debe especificar tenantId', 400);
      }
    } else if (userRole === 'admin') {
      // Admin debe especificar unidad y usuario
      if (!unitId) {
        throw new AppError('Admin debe especificar unitId', 400);
      }
    } else if (userRole === 'residente' || userRole === 'familiar') {
      // Usuario solo puede registrar su propio pago
      if (String(userId) !== String(req.user?.id)) {
        throw new AppError('No tienes permisos para registrar pago de otro usuario', 403);
      }
    }

    const charge = await getChargeForPayment(String(chargeId), targetTenantId);
    const pricing = resolveChargeTotal(charge.toObject());

    // Validar el comprobante contra nuestro Storage antes de persistir el
    // blob name; rechazar URLs que no correspondan al proof que subió el
    // caller (impide que un usuario apunte a blobs de otro usuario/tenant
    // y reciba un SAS firmado para ellos más tarde).
    let resolvedBlobName: string | undefined;
    const rawProofUrl = String(proofOfPaymentUrl || '').trim();
    if (rawProofUrl) {
      const uploaderId = req.user?.id ? String(req.user.id) : undefined;
      const owned = resolveOwnedProofBlobName(rawProofUrl, targetTenantId, uploaderId);
      if (!owned) {
        throw new AppError('El comprobante no corresponde a una carga válida', 400);
      }
      resolvedBlobName = owned;
      blobToCleanupOnFailure = owned;
    }

    // Determinar status según el tipo de pago
    let paymentStatus = 'pending';
    if (provider === 'stripe') {
      paymentStatus = 'paid'; // Pago de Stripe completo inmediatamente
    } else if (provider === 'manual' && rawProofUrl) {
      paymentStatus = 'in_review'; // Comprobante requiere revisión
    }

    const paymentData = {
      tenantId: targetTenantId,
      unitId: unitId || undefined,
      userId,
      chargeId,
      baseAmount: pricing.baseAmount,
      lateFeeAmount: pricing.lateFeeAmount,
      daysOverdue: pricing.daysOverdue,
      amount: pricing.totalAmount,
      currency: currency || 'mxn',
      provider: provider || 'manual',
      status: paymentStatus,
      proofOfPaymentUrl: rawProofUrl || undefined,
      proofOfPaymentBlobName: resolvedBlobName,
      paymentDate: new Date(),
    };

    const payment = await paymentsService.createPaymentInTenant(paymentData, targetTenantId);
    // Payment persisted — the uploaded blob now has a DB owner and
    // must not be cleaned up, even if downstream work fails.
    blobToCleanupOnFailure = undefined;

    if (payment.status === 'paid' || payment.status === 'completed') {
      await markChargeAsPaid(String(chargeId), targetTenantId);
    }

    logger.log('payments.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', {
      paymentId: String(payment._id),
      provider: payment.provider,
      status: payment.status,
    });
    res.status(201).json({ success: true, payment });
  } catch (err: unknown) {
    if (blobToCleanupOnFailure) {
      // Best-effort — the payment row was never persisted, so remove the
      // orphaned blob instead of leaving it in Azure where retries would
      // keep accumulating copies.
      const removed = await deletePaymentProofBlob(blobToCleanupOnFailure);
      logger.log('payments.create.proofCleanup', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', {
        blobName: blobToCleanupOnFailure,
        removed,
      });
    }
    logger.error('payments.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al registrar pago', 400, { cause: toError(err).message }));
  }
};

export const uploadPaymentProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('Debes seleccionar un comprobante de pago', 400);
    }

    // Superadmins are global (no tenantId claim) but can upload proofs
    // for any tenant — they must tell us which one via form-data so the
    // blob ends up under proofs/{thatTenant}/... and the later
    // createPayment ownership check against that tenant passes.
    const requestedTenantId = String(req.body?.tenantId || '').trim();
    if (req.user?.role === 'superadmin' && !req.tenantId && !requestedTenantId) {
      throw new AppError(
        'Superadmin debe indicar el tenant destino para cargar el comprobante',
        400
      );
    }
    const tenantId =
      req.user?.role === 'superadmin' && requestedTenantId
        ? requestedTenantId
        : req.tenantId || req.user?.tenantId || 'global';

    const uploadedFile = await uploadPaymentProofToAzure(req.file, tenantId, req.user?.id ? String(req.user.id) : undefined);

    logger.log('payments.proof.upload', req.user?.id ? String(req.user.id) : 'system', tenantId, {
      blobName: uploadedFile.blobName,
      contentType: req.file.mimetype,
    });

    res.status(201).json({
      success: true,
      proofOfPaymentUrl: uploadedFile.url,
      blobName: uploadedFile.blobName,
    });
  } catch (err: unknown) {
    logger.error('payments.proof.upload.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al subir comprobante', 400, { cause: toError(err).message }));
  }
};

export const getPaymentProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentId = String(req.params.id);
    const role = req.user?.role;
    const payment =
      role === 'superadmin'
        ? await paymentsService.findPaymentById(paymentId)
        : await paymentsService.findPaymentByIdInTenant(paymentId, req.tenantId);

    if (!payment) {
      throw new AppError('Pago no encontrado', 404);
    }

    if ((role === 'residente' || role === 'familiar') && String(payment.userId) !== String(req.user?.id)) {
      throw new AppError('No tienes permisos para ver este comprobante', 403);
    }

    if (!payment.proofOfPaymentUrl && !payment.proofOfPaymentBlobName) {
      throw new AppError('El pago no tiene comprobante', 404);
    }

    // Only mint a fresh SAS URL for blob names that createPayment validated
    // and persisted. Deriving a path from an arbitrary stored URL (e.g. a
    // browser blob: URL or a third-party host from legacy records) would
    // produce a bogus Azure SAS URL for a blob that doesn't exist.
    if (payment.proofOfPaymentBlobName) {
      const proofUrl = await getPaymentProofSasUrl(payment.proofOfPaymentBlobName);
      return res.json({ success: true, proofUrl });
    }

    // Legacy payments predate the blob-name migration: return the
    // original URL as-is so pre-existing records remain openable —
    // except for browser object URLs (blob:...) that the previous
    // frontend created via URL.createObjectURL. Those only live inside
    // the uploader's original browser session, so surfacing them to
    // reviewers would render a working-looking "Ver archivo" action
    // that opens a dead link.
    const legacyProofUrl = payment.proofOfPaymentUrl ? String(payment.proofOfPaymentUrl) : '';
    if (legacyProofUrl && /^https?:\/\//i.test(legacyProofUrl)) {
      return res.json({ success: true, proofUrl: legacyProofUrl });
    }

    throw new AppError('No se pudo resolver el comprobante', 404);
  } catch (err: unknown) {
    logger.error('payments.proof.get.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al abrir comprobante', 400, { cause: toError(err).message }));
  }
};

export const createStripeCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, userId, chargeId, currency, tenantId: requestedTenantId } = req.body;
    const targetTenantId = req.user?.role === 'superadmin' && requestedTenantId ? String(requestedTenantId) : req.tenantId;

    if (!targetTenantId) {
      throw new AppError('No se pudo determinar el tenant destino', 400);
    }

    if (!userId || !chargeId) {
      throw new AppError('userId y chargeId son obligatorios para iniciar checkout', 400);
    }

    const charge = await getChargeForPayment(String(chargeId), targetTenantId);
    const pricing = resolveChargeTotal(charge.toObject());

    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!successUrl || !cancelUrl) {
      throw new AppError('Configura STRIPE_SUCCESS_URL y STRIPE_CANCEL_URL', 500);
    }

    const stripe = getStripeClient();
    const resolvedSuccessUrl = normalizeStripeCheckoutUrl(successUrl, 'success');
    const resolvedCancelUrl = normalizeStripeCheckoutUrl(cancelUrl, 'cancel');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (currency || 'mxn').toLowerCase(),
            unit_amount: Math.round(pricing.totalAmount * 100),
            product_data: {
              name: 'Pago de condominio',
            },
          },
        },
      ],
      metadata: {
        tenantId: targetTenantId,
        userId,
        chargeId,
        amount: String(pricing.totalAmount),
        baseAmount: String(pricing.baseAmount),
        lateFeeAmount: String(pricing.lateFeeAmount),
        daysOverdue: String(pricing.daysOverdue),
      },
    });

    // Intentionally do NOT insert a pending Payment row here. The Stripe
    // webhook (checkout.session.completed / async_payment_succeeded) and
    // confirmStripeCheckoutSession both upsert the final 'paid' record
    // when the checkout actually settles; writing an eager 'pending' row
    // would become the latest payment for this charge and mask an
    // existing 'in_review' manual proof in /charges' paymentStatus
    // enrichment if the user abandons the Stripe flow.

    logger.log('payments.checkoutSession.create', req.user?.id ? String(req.user.id) : 'system', targetTenantId || 'global', { sessionId: session.id, userId, chargeId });
    res.status(201).json({ success: true, sessionId: session.id, checkoutUrl: session.url });
  } catch (err: unknown) {
    logger.error('payments.checkoutSession.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al crear sesion de Stripe', 400, { cause: toError(err).message }));
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  try {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ success: false, message: 'STRIPE_WEBHOOK_SECRET no configurado' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({ success: false, message: 'Firma de Stripe invalida o ausente' });
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      if (metadata.tenantId && metadata.userId && metadata.chargeId && metadata.amount) {
        await paymentsService.upsertPaymentByStripeSessionId(session.id, {
          tenantId: metadata.tenantId,
          userId: metadata.userId,
          chargeId: metadata.chargeId,
          baseAmount: metadata.baseAmount ? Number(metadata.baseAmount) : undefined,
          lateFeeAmount: metadata.lateFeeAmount ? Number(metadata.lateFeeAmount) : 0,
          daysOverdue: metadata.daysOverdue ? Number(metadata.daysOverdue) : 0,
          amount: Number(metadata.amount),
          currency: session.currency || 'mxn',
          provider: 'stripe',
          status: 'completed',
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          paymentDate: new Date(),
        });
        await markChargeAsPaid(String(metadata.chargeId), String(metadata.tenantId));
        logger.log('payments.webhook.completed', 'stripe-webhook', metadata.tenantId, {
          sessionId: session.id,
          userId: metadata.userId,
          chargeId: metadata.chargeId,
          eventType: event.type,
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err: unknown) {
    logger.error('payments.webhook.error', 'stripe-webhook', 'global', toError(err));
    res.status(400).json({ success: false, message: 'Error en webhook de Stripe', error: toError(err).message });
  }
};

export const confirmStripeCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = String(req.params.sessionId || '').trim();
    if (!sessionId) {
      throw new AppError('sessionId es obligatorio', 400);
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = session.metadata || {};

    if (!metadata.tenantId || !metadata.userId || !metadata.chargeId || !metadata.amount) {
      throw new AppError('La sesión de Stripe no contiene metadata de pago suficiente', 400);
    }

    const targetTenantId = String(metadata.tenantId);
    const sameTenant = String(req.tenantId || req.user?.tenantId || '') === targetTenantId;
    const role = req.user?.role;
    const isSuperadmin = role === 'superadmin';

    if (!sameTenant && !isSuperadmin) {
      throw new AppError('No tienes permisos para confirmar esta sesión', 403);
    }

    if ((role === 'residente' || role === 'familiar') && String(metadata.userId) !== String(req.user?.id)) {
      throw new AppError('No tienes permisos para confirmar esta sesión', 403);
    }

    if (session.payment_status !== 'paid') {
      return res.json({
        success: true,
        paid: false,
        message: 'Stripe aún no reporta el pago como liquidado.',
      });
    }

    const payment = await paymentsService.upsertPaymentByStripeSessionId(session.id, {
      tenantId: targetTenantId,
      userId: metadata.userId,
      chargeId: metadata.chargeId,
      baseAmount: metadata.baseAmount ? Number(metadata.baseAmount) : undefined,
      lateFeeAmount: metadata.lateFeeAmount ? Number(metadata.lateFeeAmount) : 0,
      daysOverdue: metadata.daysOverdue ? Number(metadata.daysOverdue) : 0,
      amount: Number(metadata.amount),
      currency: session.currency || 'mxn',
      provider: 'stripe',
      status: 'completed',
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      paymentDate: new Date(),
    });

    await markChargeAsPaid(String(metadata.chargeId), targetTenantId);

    logger.log('payments.checkout.confirm', req.user?.id ? String(req.user.id) : 'system', targetTenantId, {
      sessionId,
      chargeId: String(metadata.chargeId),
      userId: String(metadata.userId),
    });

    res.json({
      success: true,
      paid: true,
      payment,
    });
  } catch (err: unknown) {
    logger.error('payments.checkout.confirm.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('No fue posible confirmar la sesión de Stripe', 400, { cause: toError(err).message }));
  }
};

// Superadmins without a tenantId claim are allowed through the tenant
// middleware on /api/payments, so for mutation handlers that scope by
// req.tenantId we first resolve the tenant from the stored record when
// the caller is a superadmin and no token tenant is present. Otherwise
// the findOne filter becomes { _id, tenantId: undefined } and the
// operation always misses.
const resolveTenantScopeForPayment = async (req: Request, paymentId: string): Promise<string | undefined> => {
  if (req.tenantId) {
    return req.tenantId;
  }

  if (req.user?.role === 'superadmin') {
    const existing = await paymentsService.findPaymentById(paymentId);
    if (existing?.tenantId) {
      return String(existing.tenantId);
    }
  }

  return req.tenantId;
};

// Whitelist of fields the update endpoint is allowed to mutate. In
// particular, proofOfPaymentUrl / proofOfPaymentBlobName are set by the
// /payments and /payments/proofs flow (with an ownership check against
// our Azure storage) and must not be editable via /payments/:id —
// otherwise an admin could point a payment at another tenant's blob and
// then fetch a SAS URL for it via GET /payments/:id/proof.
const PAYMENT_UPDATABLE_FIELDS = [
  'status',
  'amount',
  'baseAmount',
  'lateFeeAmount',
  'daysOverdue',
  'currency',
  'provider',
  'paymentDate',
  'reviewedBy',
  'reviewedAt',
  'unitId',
] as const;

const pickPaymentUpdates = (body: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const field of PAYMENT_UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      sanitized[field] = body[field];
    }
  }
  return sanitized;
};

export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentId = String(req.params.id);
    const tenantScope = await resolveTenantScopeForPayment(req, paymentId);
    const sanitizedBody = pickPaymentUpdates(req.body || {});
    const payment = await paymentsService.updatePaymentInTenant(paymentId, tenantScope, sanitizedBody);
    if (!payment) {
      throw new AppError('Pago no encontrado', 404);
    }

    logger.log('payments.update', req.user?.id ? String(req.user.id) : 'system', tenantScope || 'global', { paymentId });
    res.json({ success: true, payment });
  } catch (err: unknown) {
    logger.error('payments.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar pago', 400, { cause: toError(err).message }));
  }
};

export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentId = String(req.params.id);
    const tenantScope = await resolveTenantScopeForPayment(req, paymentId);
    const payment = await paymentsService.deletePaymentInTenant(paymentId, tenantScope);
    if (!payment) {
      throw new AppError('Pago no encontrado', 404);
    }

    // Remove the uploaded proof blob from Azure so we don't leak the
    // comprobante file when an admin intentionally deletes the payment.
    // Best-effort: Mongo row is already gone, so we log the outcome but
    // don't fail the request if storage cleanup errors out.
    if (payment.proofOfPaymentBlobName) {
      const removed = await deletePaymentProofBlob(String(payment.proofOfPaymentBlobName));
      logger.log('payments.delete.proofCleanup', req.user?.id ? String(req.user.id) : 'system', tenantScope || 'global', {
        paymentId,
        blobName: payment.proofOfPaymentBlobName,
        removed,
      });
    }

    logger.log('payments.delete', req.user?.id ? String(req.user.id) : 'system', tenantScope || 'global', { paymentId });
    res.json({ success: true, message: 'Pago eliminado' });
  } catch (err: unknown) {
    logger.error('payments.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al eliminar pago', 400, { cause: toError(err).message }));
  }
};

export const approvePaymentWithProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Solo admin y superadmin pueden aprobar pagos
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      throw new AppError('No tienes permisos para aprobar pagos', 403);
    }

    const paymentId = String(req.params.id);
    const payment =
      req.user?.role === 'superadmin'
        ? await paymentsService.findPaymentById(paymentId)
        : await paymentsService.findPaymentByIdInTenant(paymentId, req.tenantId);

    if (!payment) {
      throw new AppError('Pago no encontrado', 404);
    }

    if (payment.status !== 'in_review') {
      throw new AppError('Solo se pueden aprobar pagos en revisión', 400);
    }

    if (!payment.proofOfPaymentUrl) {
      throw new AppError('El pago no tiene comprobante', 400);
    }

    // Actualizar pago a completado
    const tenantId = String(payment.tenantId);
    const updatedPayment = await paymentsService.updatePaymentInTenant(paymentId, tenantId, {
      status: 'completed',
      reviewedBy: req.user?.id,
      reviewedAt: new Date(),
    });

    await markChargeAsPaid(String(payment.chargeId), tenantId);

    logger.log('payments.approve', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', {
      paymentId,
      proofOfPayment: true,
    });

    res.json({ success: true, message: 'Pago aprobado', payment: updatedPayment });
  } catch (err: unknown) {
    logger.error('payments.approve.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al aprobar pago', 400, { cause: toError(err).message }));
  }
};

export const rejectPaymentWithProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Solo admin y superadmin pueden rechazar pagos
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      throw new AppError('No tienes permisos para rechazar pagos', 403);
    }

    const paymentId = String(req.params.id);
    const payment =
      req.user?.role === 'superadmin'
        ? await paymentsService.findPaymentById(paymentId)
        : await paymentsService.findPaymentByIdInTenant(paymentId, req.tenantId);

    if (!payment) {
      throw new AppError('Pago no encontrado', 404);
    }

    if (payment.status !== 'in_review') {
      throw new AppError('Solo se pueden rechazar pagos en revisión', 400);
    }

    // Actualizar pago a fallido
    const tenantId = String(payment.tenantId);
    const updatedPayment = await paymentsService.updatePaymentInTenant(paymentId, tenantId, {
      status: 'failed',
      reviewedBy: req.user?.id,
      reviewedAt: new Date(),
    });

    logger.log('payments.reject', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', {
      paymentId,
      proofOfPayment: true,
    });

    res.json({ success: true, message: 'Pago rechazado', payment: updatedPayment });
  } catch (err: unknown) {
    logger.error('payments.reject.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al rechazar pago', 400, { cause: toError(err).message }));
  }
};
