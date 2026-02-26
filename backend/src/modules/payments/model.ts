import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  chargeId: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chargeId: { type: Schema.Types.ObjectId, ref: 'Charge', required: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;
