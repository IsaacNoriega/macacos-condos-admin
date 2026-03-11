import Payment from './model';

export const findPaymentsByTenant = (tenantId?: string) => {
  return Payment.find({ tenantId });
};

export const findPaymentByIdInTenant = (paymentId: string, tenantId?: string) => {
  return Payment.findOne({ _id: paymentId, tenantId });
};

export const createPaymentInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const payment = new Payment({ ...payload, tenantId });
  await payment.save();
  return payment;
};

export const findPaymentByStripeSessionId = (sessionId: string) => {
  return Payment.findOne({ stripeSessionId: sessionId });
};

export const updatePaymentInTenant = (paymentId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  return Payment.findOneAndUpdate(
    { _id: paymentId, tenantId },
    payload,
    { new: true }
  );
};

export const upsertPaymentByStripeSessionId = (sessionId: string, payload: Record<string, unknown>) => {
  return Payment.findOneAndUpdate(
    { stripeSessionId: sessionId },
    payload,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export const deletePaymentInTenant = (paymentId: string, tenantId?: string) => {
  return Payment.findOneAndDelete({ _id: paymentId, tenantId });
};
