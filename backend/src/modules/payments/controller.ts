import { Request, Response } from 'express';
import Payment from './model';
import Stripe from 'stripe';
import logger from '../../utils/logger';

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY no configurado');
  }

  return new Stripe(secretKey);
};

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const payments = await Payment.find({ tenantId: req.tenantId });
    res.json({ success: true, payments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener pagos', error: err.message });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const payment = new Payment({
      ...req.body,
      tenantId: req.tenantId,
      provider: req.body.provider || 'manual',
      status: req.body.status || 'paid',
      paymentDate: req.body.paymentDate || new Date(),
    });
    await payment.save();
    logger.log('payments.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { paymentId: String(payment._id), provider: payment.provider });
    res.status(201).json({ success: true, payment });
  } catch (err: any) {
    logger.error('payments.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al registrar pago', error: err.message });
  }
};

export const createStripeCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { amount, userId, chargeId, currency } = req.body;

    if (!amount || !userId || !chargeId) {
      return res.status(400).json({
        success: false,
        message: 'amount, userId y chargeId son obligatorios para iniciar checkout',
      });
    }

    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!successUrl || !cancelUrl) {
      return res.status(500).json({
        success: false,
        message: 'Configura STRIPE_SUCCESS_URL y STRIPE_CANCEL_URL',
      });
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
  } catch (err: any) {
    logger.error('payments.checkoutSession.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al crear sesion de Stripe', error: err.message });
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
        await Payment.findOneAndUpdate(
          { stripeSessionId: session.id },
          {
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
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        logger.log('payments.webhook.completed', 'stripe-webhook', metadata.tenantId, { sessionId: session.id, userId: metadata.userId, chargeId: metadata.chargeId });
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    logger.error('payments.webhook.error', 'stripe-webhook', 'global', err);
    res.status(400).json({ success: false, message: 'Error en webhook de Stripe', error: err.message });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
    if (!payment) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    logger.log('payments.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { paymentId: req.params.id });
    res.json({ success: true, payment });
  } catch (err: any) {
    logger.error('payments.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al actualizar pago', error: err.message });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!payment) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    logger.log('payments.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { paymentId: req.params.id });
    res.json({ success: true, message: 'Pago eliminado' });
  } catch (err: any) {
    logger.error('payments.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al eliminar pago', error: err.message });
  }
};
