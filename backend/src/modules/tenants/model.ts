import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  identifier: string; // Ej: "MAC01", "ALAMEDAS"
  address: string;
  contactEmail: string;
  createdAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  identifier: { type: String, required: true, unique: true, lowercase: true, trim: true },
  address: { type: String, required: true },
  contactEmail: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
export default Tenant;
