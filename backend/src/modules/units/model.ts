import mongoose, { Document, Schema } from 'mongoose';

export interface IUnit extends Document {
  tenantId: mongoose.Types.ObjectId;
  code: string;
  type: 'departamento' | 'casa';
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

const unitSchema = new Schema<IUnit>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  code: { type: String, required: true, trim: true },
  type: { type: String, enum: ['departamento', 'casa'], required: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

unitSchema.index({ tenantId: 1, code: 1 }, { unique: true });

const Unit = mongoose.model<IUnit>('Unit', unitSchema);
export default Unit;
