import Unit from './model';

export const findAllUnits = () => {
  return Unit.find({});
};

export const findUnitsByTenant = (tenantId?: string) => {
  const filter = tenantId ? { tenantId } : {};
  return Unit.find(filter);
};

export const findUnitByIdInTenant = (unitId: string, tenantId?: string) => {
  const filter = tenantId ? { _id: unitId, tenantId } : { _id: unitId };
  return Unit.findOne(filter);
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
    { new: true }
  );
};

export const deleteUnitInTenant = (unitId: string, tenantId?: string) => {
  const filter = tenantId ? { _id: unitId, tenantId } : { _id: unitId };
  return Unit.findOneAndDelete(filter);
};
