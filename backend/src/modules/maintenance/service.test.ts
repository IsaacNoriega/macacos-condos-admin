import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, MaintenanceMock } = vi.hoisted(() => {
  const saveMock = vi.fn();
  class MaintenanceMock {
    static find = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static findOneAndDelete = vi.fn();
    [key: string]: unknown;
    constructor(payload: Record<string, unknown>) { Object.assign(this, payload); this.save = saveMock; }
    save: () => Promise<void>;
  }
  return { saveMock, MaintenanceMock };
});

vi.mock('./model', () => ({ __esModule: true, default: MaintenanceMock }));

import {
  createMaintenanceInTenant,
  deleteMaintenanceInTenant,
  findAllMaintenance,
  findMaintenanceByIdInTenant,
  findMaintenanceByTenant,
  updateMaintenanceInTenant,
} from './service';

describe('maintenance service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findAllMaintenance calls Maintenance.find({})', () => {
    MaintenanceMock.find.mockReturnValue([]);
    findAllMaintenance();
    expect(MaintenanceMock.find).toHaveBeenCalledWith({});
  });

  it('findMaintenanceByTenant queries by tenantId', () => {
    MaintenanceMock.find.mockReturnValue([]);
    findMaintenanceByTenant('tenant-1');
    expect(MaintenanceMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
  });

  it('findMaintenanceByIdInTenant queries by id and tenantId', () => {
    MaintenanceMock.findOne.mockReturnValue({ _id: 'm1' });
    findMaintenanceByIdInTenant('m1', 'tenant-1');
    expect(MaintenanceMock.findOne).toHaveBeenCalledWith({ _id: 'm1', tenantId: 'tenant-1' });
  });

  it('createMaintenanceInTenant persists with tenantId', async () => {
    const payload = { title: 'Fuga de agua', description: 'Piso 3' };
    const result = await createMaintenanceInTenant(payload, 'tenant-1');
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ tenantId: 'tenant-1', title: 'Fuga de agua' }));
  });

  it('updateMaintenanceInTenant calls findOneAndUpdate', () => {
    MaintenanceMock.findOneAndUpdate.mockReturnValue({ _id: 'm1' });
    updateMaintenanceInTenant('m1', 'tenant-1', { status: 'resuelto' });
    expect(MaintenanceMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'm1', tenantId: 'tenant-1' },
      { status: 'resuelto' },
      { new: true }
    );
  });

  it('deleteMaintenanceInTenant calls findOneAndDelete', () => {
    MaintenanceMock.findOneAndDelete.mockReturnValue({ _id: 'm1' });
    deleteMaintenanceInTenant('m1', 'tenant-1');
    expect(MaintenanceMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'm1', tenantId: 'tenant-1' });
  });
});
