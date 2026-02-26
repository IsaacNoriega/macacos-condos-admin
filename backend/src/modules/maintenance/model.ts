import mongoose, { Document, Schema } from 'mongoose';

export interface IMaintenanceHistory {
  status: string;
  date: Date;
  changedBy: mongoose.Types.ObjectId;
}

export interface IMaintenance extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  description: string;
  status: 'pendiente' | 'en progreso' | 'resuelto';
  assignedTo?: mongoose.Types.ObjectId;
  history: IMaintenanceHistory[];
  createdAt: Date;
}

const maintenanceSchema = new Schema<IMaintenance>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pendiente', 'en progreso', 'resuelto'], default: 'pendiente' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  history: [{
    status: String,
    date: Date,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Maintenance = mongoose.model<IMaintenance>('Maintenance', maintenanceSchema);
export default Maintenance;
