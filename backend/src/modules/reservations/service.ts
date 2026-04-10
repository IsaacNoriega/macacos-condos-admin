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
  return Reservation.find({ tenantId });
};

export const findReservationByIdInTenant = (reservationId: string, tenantId?: string) => {
  return Reservation.findOne({ _id: reservationId, tenantId });
};

export const findReservationConflict = (
  tenantId: string,
  amenity: string,
  start: Date,
  end: Date,
  excludeReservationId?: string
) => {
  const query: {
    tenantId: string;
    amenity: string;
    status: 'activa';
    start: { $lt: Date };
    end: { $gt: Date };
    _id?: { $ne: string };
  } = {
    tenantId,
    amenity,
    status: 'activa',
    start: { $lt: end },
    end: { $gt: start },
  };

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
  return Reservation.findOneAndUpdate(
    { _id: reservationId, tenantId },
    payload,
    { new: true }
  );
};

export const deleteReservationInTenant = (reservationId: string, tenantId?: string) => {
  return Reservation.findOneAndDelete({ _id: reservationId, tenantId });
};
