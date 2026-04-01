import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  chargeId: mongoose.Types.ObjectId;
  baseAmount?: number;
  lateFeeAmount?: number;
  daysOverdue?: number;
  amount: number;
  currency: string;
  provider: 'manual' | 'stripe';
  status: 'pending' | 'in_review' | 'completed' | 'failed' | 'paid';
  proofOfPaymentUrl?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentDate: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  unitId: { type: Schema.Types.ObjectId, ref: 'Unit', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chargeId: { type: Schema.Types.ObjectId, ref: 'Charge', required: true },
  baseAmount: { type: Number },
  lateFeeAmount: { type: Number, default: 0 },
  daysOverdue: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'mxn', lowercase: true, trim: true },
  provider: { type: String, enum: ['manual', 'stripe'], default: 'manual' },
  status: { type: String, enum: ['pending', 'in_review', 'completed', 'failed', 'paid'], default: 'pending', index: true },
  proofOfPaymentUrl: { type: String },
  stripeSessionId: { type: String, unique: true, sparse: true },
  stripePaymentIntentId: { type: String, index: true },
  paymentDate: { type: Date, default: Date.now },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;
