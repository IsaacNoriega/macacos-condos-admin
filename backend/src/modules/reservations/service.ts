import { Types } from 'mongoose';
import Reservation from './model';

export type ReservationDisplayStatus = 'activa' | 'cancelada' | 'finalizada';

export const getReservationDisplayStatus = (
  reservation: { status: 'activa' | 'cancelada'; end: Date | string },
  now = new Date()
): ReservationDisplayStatus => {
  if (reservation.status === 'cancelada') {
    return 'cancelada';
  }

  const endDate = new Date(reservation.end);
  if (Number.isNaN(endDate.getTime())) {
    return 'activa';
  }

  return now.getTime() >= endDate.getTime() ? 'finalizada' : 'activa';
};

export const serializeReservation = (reservation: any, now = new Date()) => {
  const plainReservation = typeof reservation?.toObject === 'function' ? reservation.toObject() : { ...reservation };

  return {
    ...plainReservation,
    currentStatus: getReservationDisplayStatus(plainReservation, now),
  };
};

export const findAllReservations = () => {
  return Reservation.find({});
};

export const findReservationsByTenant = (tenantId?: string) => {
  const filter = tenantId ? { tenantId } : {};
  return Reservation.find(filter);
};

export const findReservationByIdInTenant = (reservationId: string, tenantId?: string) => {
  const filter: any = { _id: reservationId };
  if (tenantId) filter.tenantId = tenantId;
  return Reservation.findOne(filter);
};

export const findReservationConflict = (
  tenantId: string | undefined,
  amenity: string,
  start: Date,
  end: Date,
  excludeReservationId?: string
) => {
  const query: any = {
    amenity,
    status: 'activa',
    start: { $lt: end },
    end: { $gt: start },
  };

  if (tenantId) query.tenantId = tenantId;
  if (excludeReservationId) {
    query._id = { $ne: excludeReservationId };
  }

  return Reservation.findOne(query).lean();
};

export const createReservationInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const reservation = new Reservation({ ...payload, tenantId });
  await reservation.save();
  return reservation;
};

export const updateReservationInTenant = (
  reservationId: string,
  tenantId: string | undefined,
  payload: Record<string, unknown>
) => {
  const filter: any = { _id: reservationId };
  if (tenantId) filter.tenantId = tenantId;
  return Reservation.findOneAndUpdate(
    filter,
    payload,
    { new: true }
  );
};

export const deleteReservationInTenant = (reservationId: string, tenantId?: string) => {
  const filter: any = { _id: reservationId };
  if (tenantId) filter.tenantId = tenantId;
  return Reservation.findOneAndDelete(filter);
};
