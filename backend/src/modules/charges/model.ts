import mongoose, { Document, Schema } from 'mongoose';

export interface ICharge extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  createdAt: Date;
}

const chargeSchema = new Schema<ICharge>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  isPaid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Charge = mongoose.model<ICharge>('Charge', chargeSchema);
export default Charge;
