import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  address: string;
  contactEmail: string;
  createdAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  contactEmail: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
export default Tenant;
