import Maintenance from './model';

export const findAllMaintenance = () => {
  return Maintenance.find({});
};

export const findMaintenanceByTenant = (tenantId?: string) => {
  return Maintenance.find({ tenantId });
};

export const findMaintenanceByIdInTenant = (maintenanceId: string, tenantId?: string) => {
  return Maintenance.findOne({ _id: maintenanceId, tenantId });
};

export const createMaintenanceInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const maintenance = new Maintenance({ ...payload, tenantId });
  await maintenance.save();
  return maintenance;
};

export const updateMaintenanceInTenant = (maintenanceId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  return Maintenance.findOneAndUpdate(
    { _id: maintenanceId, tenantId },
    payload,
    { new: true }
  );
};

export const deleteMaintenanceInTenant = (maintenanceId: string, tenantId?: string) => {
  return Maintenance.findOneAndDelete({ _id: maintenanceId, tenantId });
};
