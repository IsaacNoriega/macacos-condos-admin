import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as paymentsService from './service';
import Charge from '../charges/model';

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
  await Charge.updateOne({ _id: chargeId, tenantId }, { isPaid: true });
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
    let payments;

    if (req.user?.role === 'superadmin') {
      payments = queryTenantId
        ? await paymentsService.findPaymentsByTenant(String(queryTenantId))
        : await paymentsService.findAllPayments();
    } else {
      payments = await paymentsService.findPaymentsByTenant(req.tenantId);
    }

    res.json({ success: true, payments });
  } catch (err: unknown) {
    next(new AppError('Error al obtener pagos', 500, { cause: toError(err).message }));
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId: requestedTenantId, unitId, userId, chargeId, currency, provider, proofOfPaymentUrl } = req.body;
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

    // Determinar status según el tipo de pago
    let paymentStatus = 'pending';
    if (provider === 'stripe') {
      paymentStatus = 'paid'; // Pago de Stripe completo inmediatamente
    } else if (provider === 'manual' && proofOfPaymentUrl) {
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
      proofOfPaymentUrl: proofOfPaymentUrl || undefined,
      paymentDate: new Date(),
    };

    const payment = await paymentsService.createPaymentInTenant(paymentData, targetTenantId);

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
    logger.error('payments.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al registrar pago', 400, { cause: toError(err).message }));
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
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
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

    if (event.type === 'checkout.session.completed') {
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
          status: 'paid',
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          paymentDate: new Date(),
        });
        await markChargeAsPaid(String(metadata.chargeId), String(metadata.tenantId));
        logger.log('payments.webhook.completed', 'stripe-webhook', metadata.tenantId, { sessionId: session.id, userId: metadata.userId, chargeId: metadata.chargeId });
      }
    }

    res.status(200).json({ received: true });
  } catch (err: unknown) {
    logger.error('payments.webhook.error', 'stripe-webhook', 'global', toError(err));
    res.status(400).json({ success: false, message: 'Error en webhook de Stripe', error: toError(err).message });
  }
};

export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await paymentsService.updatePaymentInTenant(String(req.params.id), req.tenantId, req.body);
    if (!payment) {
      throw new AppError('Pago no encontrado', 404);
    }

    logger.log('payments.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { paymentId: req.params.id });
    res.json({ success: true, payment });
  } catch (err: unknown) {
    logger.error('payments.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al actualizar pago', 400, { cause: toError(err).message }));
  }
};

export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await paymentsService.deletePaymentInTenant(String(req.params.id), req.tenantId);
    if (!payment) {
      throw new AppError('Pago no encontrado', 404);
    }

    logger.log('payments.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { paymentId: req.params.id });
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
    const payment = await paymentsService.findPaymentById(paymentId);

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
    const payment = await paymentsService.findPaymentById(paymentId);

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
