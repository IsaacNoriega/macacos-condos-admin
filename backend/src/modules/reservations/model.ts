import mongoose, { Document, Schema } from 'mongoose';

export interface IReservation extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amenity: string;
  start: Date;
  end: Date;
  status: 'activa' | 'cancelada';
  createdAt: Date;
}

const reservationSchema = new Schema<IReservation>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amenity: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  status: { type: String, enum: ['activa', 'cancelada'], default: 'activa' },
  createdAt: { type: Date, default: Date.now }
});

const Reservation = mongoose.model<IReservation>('Reservation', reservationSchema);
export default Reservation;
