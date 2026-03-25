import mongoose, { Document, Schema } from 'mongoose';

export interface IAmenity extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

const amenitySchema = new Schema<IAmenity>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

amenitySchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Amenity = mongoose.model<IAmenity>('Amenity', amenitySchema);
export default Amenity;
