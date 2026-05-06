import { Types } from 'mongoose';
import Maintenance from './model';

export const findAllMaintenance = () => {
  return Maintenance.find({}).populate('userId', 'name email').populate('tenantId', 'name').lean();
};

export const findMaintenanceByTenant = (tenantId?: string) => {
  const filter = tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {};
  return Maintenance.find(filter).populate('userId', 'name email').populate('tenantId', 'name').lean();
};

export const findMaintenanceByUser = (tenantId: string | undefined, userId: string) => {
  const filter: any = { userId: new Types.ObjectId(userId) };
  if (tenantId) filter.tenantId = new Types.ObjectId(tenantId);
  return Maintenance.find(filter).populate('userId', 'name email').populate('tenantId', 'name').lean();
};

export const findMaintenanceByIdInTenant = (maintenanceId: string, tenantId?: string) => {
  return Maintenance.findOne({ _id: maintenanceId, tenantId }).populate('userId', 'name email').populate('tenantId', 'name').lean();
};

export const createMaintenanceInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const maintenance = new Maintenance({ ...payload, tenantId });
  await maintenance.save();
  return maintenance;
};

export const updateMaintenanceInTenant = (maintenanceId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  const filter: any = { _id: maintenanceId };
  if (tenantId) filter.tenantId = tenantId;
  return Maintenance.findOneAndUpdate(
    filter,
    payload,
    { new: true, lean: true }
  );
};

export const deleteMaintenanceInTenant = (maintenanceId: string, tenantId?: string) => {
  const filter: any = { _id: maintenanceId };
  if (tenantId) filter.tenantId = tenantId;
  return Maintenance.findOneAndDelete(filter);
};
