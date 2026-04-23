import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock del modelo Tenant y todos los modelos relacionados ─────────────────

const {
  saveMock,
  TenantMock,
  PaymentMock,
  ChargeMock,
  ReservationMock,
  MaintenanceMock,
  ResidentMock,
  UnitMock,
  AmenityMock,
  UserMock,
  sessionMock,
} = vi.hoisted(() => {
  const saveMock = vi.fn();
  const deleteOneMock = vi.fn();
  const deleteManyMock = vi.fn();
  const commitMock = vi.fn();
  const abortMock = vi.fn();
  const endMock = vi.fn();
  const startTransactionMock = vi.fn();

  const sessionMock = {
    startTransaction: startTransactionMock,
    commitTransaction: commitMock,
    abortTransaction: abortMock,
    endSession: endMock,
  };

  const makeModel = () => ({
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    deleteMany: vi.fn().mockResolvedValue({}),
    deleteOne: deleteOneMock.mockResolvedValue({}),
    session: vi.fn().mockReturnThis(),
  });

  class TenantMock {
    static find = vi.fn();
    static findById = vi.fn();
    static findByIdAndUpdate = vi.fn();
    static deleteOne = deleteOneMock;
    [key: string]: unknown;
    constructor(payload: Record<string, unknown>) { Object.assign(this, payload); this.save = saveMock; }
    save: () => Promise<void>;
  }

  return {
    saveMock,
    TenantMock,
    PaymentMock: makeModel(),
    ChargeMock: makeModel(),
    ReservationMock: makeModel(),
    MaintenanceMock: makeModel(),
    ResidentMock: makeModel(),
    UnitMock: makeModel(),
    AmenityMock: makeModel(),
    UserMock: makeModel(),
    sessionMock,
  };
});

vi.mock('./model', () => ({ __esModule: true, default: TenantMock }));
vi.mock('../payments/model', () => ({ __esModule: true, default: PaymentMock }));
vi.mock('../charges/model', () => ({ __esModule: true, default: ChargeMock }));
vi.mock('../reservations/model', () => ({ __esModule: true, default: ReservationMock }));
vi.mock('../maintenance/model', () => ({ __esModule: true, default: MaintenanceMock }));
vi.mock('../residents/model', () => ({ __esModule: true, default: ResidentMock }));
vi.mock('../units/model', () => ({ __esModule: true, default: UnitMock }));
vi.mock('../amenities/model', () => ({ __esModule: true, default: AmenityMock }));
vi.mock('../users/model', () => ({ __esModule: true, default: UserMock }));
vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn().mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    }),
  },
}));

import { createTenant, deleteTenant, findAllTenants, findTenantById, updateTenant } from './service';

describe('tenants service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findAllTenants calls Tenant.find()', () => {
    TenantMock.find.mockReturnValue([]);
    findAllTenants();
    expect(TenantMock.find).toHaveBeenCalled();
  });

  it('findTenantById calls Tenant.findById with id', () => {
    TenantMock.findById.mockReturnValue({ _id: 't1' });
    findTenantById('t1');
    expect(TenantMock.findById).toHaveBeenCalledWith('t1');
  });

  it('createTenant persists and returns new tenant', async () => {
    const result = await createTenant({ name: 'Condo Test', address: 'Av. 1' });
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ name: 'Condo Test' }));
  });

  it('updateTenant calls findByIdAndUpdate with correct args', () => {
    TenantMock.findByIdAndUpdate.mockReturnValue({ _id: 't1', name: 'Updated' });
    updateTenant('t1', { name: 'Updated' });
    expect(TenantMock.findByIdAndUpdate).toHaveBeenCalledWith('t1', { name: 'Updated' }, { new: true });
  });

  it('deleteTenant returns null when tenant not found', async () => {
    const mongoose = await import('mongoose');
    vi.mocked(mongoose.default.startSession).mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    } as any);

    const sessionObj = { startTransaction: vi.fn(), commitTransaction: vi.fn(), abortTransaction: vi.fn(), endSession: vi.fn() };
    vi.mocked(mongoose.default.startSession).mockResolvedValue(sessionObj as any);

    const chainObj = { session: vi.fn().mockReturnValue(null) };
    TenantMock.findById.mockReturnValue(chainObj);

    const result = await deleteTenant('nonexistent');
    expect(result).toBeNull();
  });
});
