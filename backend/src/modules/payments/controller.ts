import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import * as paymentsService from './service';

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError('STRIPE_SECRET_KEY no configurado', 500);
  }

  return new Stripe(secretKey);
};

export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await paymentsService.findPaymentsByTenant(req.tenantId);
    res.json({ success: true, payments });
  } catch (err: unknown) {
    next(new AppError('Error al obtener pagos', 500, { cause: toError(err).message }));
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentData = {
      ...req.body,
      provider: req.body.provider || 'manual',
      status: req.body.status || 'paid',
      paymentDate: req.body.paymentDate || new Date(),
    };
    const payment = await paymentsService.createPaymentInTenant(paymentData, req.tenantId);
    logger.log('payments.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { paymentId: String(payment._id), provider: payment.provider });
    res.status(201).json({ success: true, payment });
  } catch (err: unknown) {
    logger.error('payments.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', toError(err));
    next(new AppError('Error al registrar pago', 400, { cause: toError(err).message }));
  }
};

export const createStripeCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, userId, chargeId, currency } = req.body;

    if (!amount || !userId || !chargeId) {
      throw new AppError('amount, userId y chargeId son obligatorios para iniciar checkout', 400);
    }

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
            unit_amount: Math.round(Number(amount) * 100),
            product_data: {
              name: 'Pago de condominio',
            },
          },
        },
      ],
      metadata: {
        tenantId: req.tenantId as string,
        userId,
        chargeId,
        amount: String(amount),
      },
    });

    logger.log('payments.checkoutSession.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { sessionId: session.id, userId, chargeId });
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
          amount: Number(metadata.amount),
          currency: session.currency || 'mxn',
          provider: 'stripe',
          status: 'paid',
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          paymentDate: new Date(),
        });
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
