import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, UnitMock } = vi.hoisted(() => {
  const saveMock = vi.fn();
  class UnitMock {
    static find = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static findOneAndDelete = vi.fn();
    [key: string]: unknown;
    constructor(payload: Record<string, unknown>) { Object.assign(this, payload); this.save = saveMock; }
    save: () => Promise<void>;
  }
  return { saveMock, UnitMock };
});

vi.mock('./model', () => ({ __esModule: true, default: UnitMock }));

import {
  createUnitInTenant,
  deleteUnitInTenant,
  findAllUnits,
  findUnitByIdInTenant,
  findUnitsByTenant,
  updateUnitInTenant,
} from './service';

describe('units service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findAllUnits calls Unit.find({})', () => {
    UnitMock.find.mockReturnValue([]);
    findAllUnits();
    expect(UnitMock.find).toHaveBeenCalledWith({});
  });

  it('findUnitsByTenant queries by tenantId when provided', () => {
    UnitMock.find.mockReturnValue([]);
    findUnitsByTenant('tenant-1');
    expect(UnitMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
  });

  it('findUnitsByTenant returns all when tenantId is undefined', () => {
    UnitMock.find.mockReturnValue([]);
    findUnitsByTenant(undefined);
    expect(UnitMock.find).toHaveBeenCalledWith({});
  });

  it('findUnitByIdInTenant queries with tenantId', () => {
    UnitMock.findOne.mockReturnValue({ _id: 'u1' });
    findUnitByIdInTenant('u1', 'tenant-1');
    expect(UnitMock.findOne).toHaveBeenCalledWith({ _id: 'u1', tenantId: 'tenant-1' });
  });

  it('findUnitByIdInTenant queries without tenantId', () => {
    UnitMock.findOne.mockReturnValue(null);
    findUnitByIdInTenant('u1', undefined);
    expect(UnitMock.findOne).toHaveBeenCalledWith({ _id: 'u1' });
  });

  it('createUnitInTenant persists unit with tenantId', async () => {
    const payload = { code: 'A-101', floor: 1 };
    const result = await createUnitInTenant(payload, 'tenant-1');
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ tenantId: 'tenant-1', code: 'A-101' }));
  });

  it('updateUnitInTenant calls findOneAndUpdate with tenantId filter', () => {
    UnitMock.findOneAndUpdate.mockReturnValue({ _id: 'u1' });
    updateUnitInTenant('u1', 'tenant-1', { code: 'B-202' });
    expect(UnitMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'u1', tenantId: 'tenant-1' },
      { code: 'B-202' },
      { new: true }
    );
  });

  it('updateUnitInTenant without tenantId uses only _id', () => {
    UnitMock.findOneAndUpdate.mockReturnValue({ _id: 'u1' });
    updateUnitInTenant('u1', undefined, { code: 'B-202' });
    expect(UnitMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'u1' },
      { code: 'B-202' },
      { new: true }
    );
  });

  it('deleteUnitInTenant calls findOneAndDelete with tenantId', () => {
    UnitMock.findOneAndDelete.mockReturnValue({ _id: 'u1' });
    deleteUnitInTenant('u1', 'tenant-1');
    expect(UnitMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'u1', tenantId: 'tenant-1' });
  });

  it('deleteUnitInTenant without tenantId uses only _id', () => {
    UnitMock.findOneAndDelete.mockReturnValue(null);
    deleteUnitInTenant('u1', undefined);
    expect(UnitMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'u1' });
  });
});
