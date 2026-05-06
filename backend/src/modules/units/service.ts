import { Types } from 'mongoose';
import Unit from './model';

export const findAllUnits = () => {
  return Unit.find({}).lean();
};

export const findUnitsByTenant = (tenantId?: string) => {
  const filter = tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {};
  return Unit.find(filter).lean();
};

export const findUnitByIdInTenant = (unitId: string, tenantId?: string) => {
  const filter = tenantId ? { _id: unitId, tenantId } : { _id: unitId };
  return Unit.findOne(filter).lean();
};

export const createUnitInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const unit = new Unit({ ...payload, tenantId });
  await unit.save();
  return unit;
};

export const updateUnitInTenant = (unitId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  const filter = tenantId ? { _id: unitId, tenantId } : { _id: unitId };
  return Unit.findOneAndUpdate(
    filter,
    payload,
    { new: true, lean: true }
  );
};

export const deleteUnitInTenant = (unitId: string, tenantId?: string) => {
  const filter = tenantId ? { _id: unitId, tenantId } : { _id: unitId };
  return Unit.findOneAndDelete(filter);
};
