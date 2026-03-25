import Tenant from './model';

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

export const deleteTenant = (tenantId: string) => {
  return Tenant.findByIdAndDelete(tenantId);
};
