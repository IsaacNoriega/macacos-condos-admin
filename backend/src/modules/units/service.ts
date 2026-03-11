import Unit from './model';

export const findUnitsByTenant = (tenantId?: string) => {
  return Unit.find({ tenantId });
};

export const findUnitByIdInTenant = (unitId: string, tenantId?: string) => {
  return Unit.findOne({ _id: unitId, tenantId });
};

export const createUnitInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const unit = new Unit({ ...payload, tenantId });
  await unit.save();
  return unit;
};

export const updateUnitInTenant = (unitId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  return Unit.findOneAndUpdate(
    { _id: unitId, tenantId },
    payload,
    { new: true }
  );
};

export const deleteUnitInTenant = (unitId: string, tenantId?: string) => {
  return Unit.findOneAndDelete({ _id: unitId, tenantId });
};
