import { Types } from 'mongoose';
import Charge from './model';

export const findAllCharges = () => {
  return Charge.find({}).lean();
};

export const findChargesByTenant = (tenantId?: string) => {
  const filter = tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {};
  return Charge.find(filter).lean();
};

export const findChargeByIdInTenant = (chargeId: string, tenantId?: string) => {
  return Charge.findOne({ _id: chargeId, tenantId });
};

export const createChargeInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const charge = new Charge({ ...payload, tenantId });
  await charge.save();
  return charge;
};

export const updateChargeInTenant = (chargeId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  const filter: any = { _id: chargeId };
  if (tenantId) filter.tenantId = tenantId;
  return Charge.findOneAndUpdate(
    filter,
    payload,
    { new: true }
  );
};

export const deleteChargeInTenant = (chargeId: string, tenantId?: string) => {
  const filter: any = { _id: chargeId };
  if (tenantId) filter.tenantId = tenantId;
  return Charge.findOneAndDelete(filter);
};

export const findChargesByUnits = (unitIds: Types.ObjectId[], tenantId?: string) => {
  const filter: any = { unitId: { $in: unitIds } };
  if (tenantId) filter.tenantId = new Types.ObjectId(tenantId);
  return Charge.find(filter).lean();
};
