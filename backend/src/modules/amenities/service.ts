import { Types } from 'mongoose';
import Amenity from './model';

export const findAllAmenities = () => {
  return Amenity.find({}).lean();
};

export const findAmenitiesByTenant = (tenantId?: string) => {
  const filter = tenantId ? { tenantId: new Types.ObjectId(tenantId) } : {};
  return Amenity.find(filter).lean();
};

export const createAmenityInTenant = async (payload: Record<string, unknown>, tenantId?: string) => {
  const amenity = new Amenity({ ...payload, tenantId });
  await amenity.save();
  return amenity;
};

export const updateAmenityInTenant = (amenityId: string, tenantId: string | undefined, payload: Record<string, unknown>) => {
  const filter: any = { _id: amenityId };
  if (tenantId) filter.tenantId = tenantId;
  return Amenity.findOneAndUpdate(filter, payload, { new: true, lean: true });
};

export const deleteAmenityInTenant = (amenityId: string, tenantId?: string) => {
  const filter: any = { _id: amenityId };
  if (tenantId) filter.tenantId = tenantId;
  return Amenity.findOneAndDelete(filter);
};
