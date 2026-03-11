import mongoose, { Document, Schema } from 'mongoose';

export interface IResident extends Document {
  tenantId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  relationship: 'propietario' | 'familiar' | 'inquilino';
  isActive: boolean;
  createdAt: Date;
}

const residentSchema = new Schema<IResident>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  relationship: { type: String, enum: ['propietario', 'familiar', 'inquilino'], required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

residentSchema.index({ tenantId: 1, unitId: 1, email: 1 }, { unique: true });

const Resident = mongoose.model<IResident>('Resident', residentSchema);
export default Resident;
