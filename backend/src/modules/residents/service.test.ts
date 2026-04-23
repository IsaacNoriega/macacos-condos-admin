import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, ResidentMock, UnitMock } = vi.hoisted(() => {
  const saveMock = vi.fn();
  class ResidentMock {
    static find = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static findOneAndDelete = vi.fn();
    static countDocuments = vi.fn();
    [key: string]: unknown;
    constructor(payload: Record<string, unknown>) { Object.assign(this, payload); this.save = saveMock; }
    save: () => Promise<void>;
  }
  const UnitMock = { findOne: vi.fn() };
  return { saveMock, ResidentMock, UnitMock };
});

vi.mock('./model', () => ({ __esModule: true, default: ResidentMock }));
vi.mock('../units/model', () => ({ __esModule: true, default: UnitMock }));

import {
  countResidentsInUnit,
  createResidentInTenant,
  deleteResidentInTenant,
  findResidentByIdInTenant,
  findResidentsByTenant,
  updateResidentInTenant,
  validateUnitInTenant,
} from './service';

describe('residents service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findResidentsByTenant queries by tenantId', () => {
    ResidentMock.find.mockReturnValue([]);
    findResidentsByTenant('tenant-1');
    expect(ResidentMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
  });

  it('findResidentByIdInTenant queries by id and tenantId', () => {
    ResidentMock.findOne.mockReturnValue({ _id: 'r1' });
    findResidentByIdInTenant('r1', 'tenant-1');
    expect(ResidentMock.findOne).toHaveBeenCalledWith({ _id: 'r1', tenantId: 'tenant-1' });
  });

  it('validateUnitInTenant returns false when tenantId is missing', async () => {
    const result = await validateUnitInTenant('u1', undefined);
    expect(result).toBe(false);
  });

  it('validateUnitInTenant returns false when unit not found', async () => {
    UnitMock.findOne.mockResolvedValue(null);
    const result = await validateUnitInTenant('u1', 'tenant-1');
    expect(result).toBe(false);
  });

  it('validateUnitInTenant returns true when unit is found', async () => {
    UnitMock.findOne.mockResolvedValue({ _id: 'u1' });
    const result = await validateUnitInTenant('u1', 'tenant-1');
    expect(result).toBe(true);
  });

  it('countResidentsInUnit calls countDocuments', () => {
    ResidentMock.countDocuments.mockResolvedValue(3);
    countResidentsInUnit('tenant-1', 'unit-1');
    expect(ResidentMock.countDocuments).toHaveBeenCalledWith({ tenantId: 'tenant-1', unitId: 'unit-1' });
  });

  it('createResidentInTenant persists resident with tenantId', async () => {
    const payload = { email: 'alice@x.com', relationship: 'propietario', unitId: 'u1' };
    const result = await createResidentInTenant(payload, 'tenant-1');
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ tenantId: 'tenant-1', email: 'alice@x.com' }));
  });

  it('updateResidentInTenant calls findOneAndUpdate', () => {
    ResidentMock.findOneAndUpdate.mockReturnValue({ _id: 'r1' });
    updateResidentInTenant('r1', 'tenant-1', { relationship: 'inquilino' });
    expect(ResidentMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'r1', tenantId: 'tenant-1' },
      { relationship: 'inquilino' },
      { new: true }
    );
  });

  it('deleteResidentInTenant calls findOneAndDelete', () => {
    ResidentMock.findOneAndDelete.mockReturnValue({ _id: 'r1' });
    deleteResidentInTenant('r1', 'tenant-1');
    expect(ResidentMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'r1', tenantId: 'tenant-1' });
  });
});
