import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, AmenityMock } = vi.hoisted(() => {
  const saveMock = vi.fn();
  class AmenityMock {
    static find = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static findOneAndDelete = vi.fn();
    [key: string]: unknown;
    constructor(payload: Record<string, unknown>) { Object.assign(this, payload); this.save = saveMock; }
    save: () => Promise<void>;
  }
  return { saveMock, AmenityMock };
});

vi.mock('./model', () => ({ __esModule: true, default: AmenityMock }));

import {
  createAmenityInTenant,
  deleteAmenityInTenant,
  findAllAmenities,
  findAmenitiesByTenant,
  updateAmenityInTenant,
} from './service';

describe('amenities service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findAllAmenities calls Amenity.find({}).lean()', () => {
    const lean = vi.fn().mockReturnValue([]);
    AmenityMock.find.mockReturnValue({ lean });
    findAllAmenities();
    expect(AmenityMock.find).toHaveBeenCalledWith({});
    expect(lean).toHaveBeenCalled();
  });

  it('findAmenitiesByTenant queries by tenantId with lean', () => {
    const lean = vi.fn().mockReturnValue([]);
    AmenityMock.find.mockReturnValue({ lean });
    findAmenitiesByTenant('tenant-1');
    expect(AmenityMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    expect(lean).toHaveBeenCalled();
  });

  it('createAmenityInTenant persists amenity with tenantId', async () => {
    const payload = { name: 'Piscina', maxDailyHours: 4 };
    const result = await createAmenityInTenant(payload, 'tenant-1');
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ tenantId: 'tenant-1', name: 'Piscina' }));
  });

  it('updateAmenityInTenant calls findOneAndUpdate', () => {
    AmenityMock.findOneAndUpdate.mockReturnValue({ _id: 'a1' });
    updateAmenityInTenant('a1', 'tenant-1', { name: 'Gym' });
    expect(AmenityMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'a1', tenantId: 'tenant-1' },
      { name: 'Gym' },
      { new: true }
    );
  });

  it('deleteAmenityInTenant calls findOneAndDelete', () => {
    AmenityMock.findOneAndDelete.mockReturnValue({ _id: 'a1' });
    deleteAmenityInTenant('a1', 'tenant-1');
    expect(AmenityMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'a1', tenantId: 'tenant-1' });
  });
});
