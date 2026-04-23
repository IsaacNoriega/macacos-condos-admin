import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, ChargeMock } = vi.hoisted(() => {
  const saveMock = vi.fn();
  class ChargeMock {
    static find = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static findOneAndDelete = vi.fn();
    [key: string]: unknown;
    constructor(payload: Record<string, unknown>) { Object.assign(this, payload); this.save = saveMock; }
    save: () => Promise<void>;
  }
  return { saveMock, ChargeMock };
});

vi.mock('./model', () => ({ __esModule: true, default: ChargeMock }));

import {
  createChargeInTenant,
  deleteChargeInTenant,
  findAllCharges,
  findChargeByIdInTenant,
  findChargesByTenant,
  updateChargeInTenant,
} from './service';

describe('charges service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findAllCharges calls Charge.find({}).lean()', () => {
    const lean = vi.fn().mockReturnValue([]);
    ChargeMock.find.mockReturnValue({ lean });
    findAllCharges();
    expect(ChargeMock.find).toHaveBeenCalledWith({});
    expect(lean).toHaveBeenCalled();
  });

  it('findChargesByTenant queries by tenantId with lean', () => {
    const lean = vi.fn().mockReturnValue([]);
    ChargeMock.find.mockReturnValue({ lean });
    findChargesByTenant('tenant-1');
    expect(ChargeMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    expect(lean).toHaveBeenCalled();
  });

  it('findChargeByIdInTenant queries by id and tenantId', () => {
    ChargeMock.findOne.mockReturnValue({ _id: 'c1' });
    findChargeByIdInTenant('c1', 'tenant-1');
    expect(ChargeMock.findOne).toHaveBeenCalledWith({ _id: 'c1', tenantId: 'tenant-1' });
  });

  it('createChargeInTenant persists charge with tenantId', async () => {
    const payload = { description: 'Cuota mensual', amount: 1200, userId: 'u1' };
    const result = await createChargeInTenant(payload, 'tenant-1');
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ tenantId: 'tenant-1', amount: 1200 }));
  });

  it('updateChargeInTenant calls findOneAndUpdate', () => {
    ChargeMock.findOneAndUpdate.mockReturnValue({ _id: 'c1' });
    updateChargeInTenant('c1', 'tenant-1', { amount: 2000 });
    expect(ChargeMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'c1', tenantId: 'tenant-1' },
      { amount: 2000 },
      { new: true }
    );
  });

  it('deleteChargeInTenant calls findOneAndDelete', () => {
    ChargeMock.findOneAndDelete.mockReturnValue({ _id: 'c1' });
    deleteChargeInTenant('c1', 'tenant-1');
    expect(ChargeMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'c1', tenantId: 'tenant-1' });
  });
});
