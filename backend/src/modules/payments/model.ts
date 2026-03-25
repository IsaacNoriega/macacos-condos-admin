import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  chargeId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  provider: 'manual' | 'stripe';
  status: 'pending' | 'paid' | 'failed';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentDate: Date;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chargeId: { type: Schema.Types.ObjectId, ref: 'Charge', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'mxn', lowercase: true, trim: true },
  provider: { type: String, enum: ['manual', 'stripe'], default: 'manual' },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
  stripeSessionId: { type: String, unique: true, sparse: true },
  stripePaymentIntentId: { type: String, index: true },
  paymentDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;
