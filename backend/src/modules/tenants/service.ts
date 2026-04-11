import Tenant from './model';
import User from '../users/model';
import Unit from '../units/model';
import Resident from '../residents/model';
import Charge from '../charges/model';
import Payment from '../payments/model';
import Maintenance from '../maintenance/model';
import Reservation from '../reservations/model';
import Amenity from '../amenities/model';
import mongoose from 'mongoose';

export const findAllTenants = () => {
  return Tenant.find();
};

export const findTenantById = (tenantId: string) => {
  return Tenant.findById(tenantId);
};

export const createTenant = async (payload: Record<string, unknown>) => {
  const tenant = new Tenant(payload);
  await tenant.save();
  return tenant;
};

export const updateTenant = (tenantId: string, payload: Record<string, unknown>) => {
  return Tenant.findByIdAndUpdate(tenantId, payload, { new: true });
};

export const deleteTenant = async (tenantId: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const tenant = await Tenant.findById(tenantId).session(session);
    if (!tenant) {
      await session.abortTransaction();
      return null;
    }

    // Elimina toda la data ligada al tenant para evitar registros huérfanos.
    await Promise.all([
      Payment.deleteMany({ tenantId }, { session }),
      Charge.deleteMany({ tenantId }, { session }),
      Reservation.deleteMany({ tenantId }, { session }),
      Maintenance.deleteMany({ tenantId }, { session }),
      Resident.deleteMany({ tenantId }, { session }),
      Unit.deleteMany({ tenantId }, { session }),
      Amenity.deleteMany({ tenantId }, { session }),
      User.deleteMany({ tenantId }, { session }),
    ]);

    await Tenant.deleteOne({ _id: tenantId }, { session });

    await session.commitTransaction();
    return tenant;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
