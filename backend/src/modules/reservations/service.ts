import Reservation from './model';

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
