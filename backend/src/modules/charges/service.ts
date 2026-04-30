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
  return Charge.findOneAndUpdate(
    { _id: chargeId, tenantId },
    payload,
    { new: true }
  );
};

export const deleteChargeInTenant = (chargeId: string, tenantId?: string) => {
  return Charge.findOneAndDelete({ _id: chargeId, tenantId });
};
