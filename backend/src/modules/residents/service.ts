import mongoose, { Types } from 'mongoose';
import Resident from './model';
import Unit from '../units/model';

export const findResidentsByTenant = (tenantId?: string) => {
  const filter = tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {};
  return Resident.find(filter).lean();
};

export const findResidentByIdInTenant = (residentId: string, tenantId?: string) => {
  return Resident.findOne({ _id: residentId, tenantId }).lean();
};

export const validateUnitInTenant = async (unitId: string, tenantId?: string) => {
  if (!tenantId) return false;
  const unit = await Unit.findOne({ _id: unitId, tenantId }).lean();
  return Boolean(unit);
};

export const countResidentsInUnit = (tenantId?: string, unitId?: string) => {
  return Resident.countDocuments({ tenantId, unitId });
};

export const createResidentInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const resident = new Resident({ ...payload, tenantId });
  await resident.save();
  return resident;
};

export const updateResidentInTenant = (residentId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  return Resident.findOneAndUpdate(
    { _id: residentId, tenantId },
    payload,
    { new: true, lean: true }
  );
};

export const deleteResidentInTenant = (residentId: string, tenantId?: string) => {
  return Resident.findOneAndDelete({ _id: residentId, tenantId });
};

export const findUnitsByUserEmail = (email: string, tenantId?: string) => {
  if (!email) return Promise.resolve([]);
  const filter: any = { email: email.toLowerCase().trim() };
  if (tenantId) filter.tenantId = new Types.ObjectId(tenantId);
  return Resident.find(filter).select('unitId').lean();
};
