import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMock, PaymentMock } = vi.hoisted(() => {
  const saveMock = vi.fn();
  class PaymentMock {
    static find = vi.fn();
    static findById = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static findOneAndDelete = vi.fn();
    [key: string]: unknown;
    constructor(payload: Record<string, unknown>) { Object.assign(this, payload); this.save = saveMock; }
    save: () => Promise<void>;
  }
  return { saveMock, PaymentMock };
});

vi.mock('./model', () => ({ __esModule: true, default: PaymentMock }));

import {
  createPaymentInTenant,
  deletePaymentInTenant,
  findAllPayments,
  findPaymentById,
  findPaymentByIdInTenant,
  findPaymentByStripeSessionId,
  findPaymentsByTenant,
  updatePaymentInTenant,
  upsertPaymentByStripeSessionId,
} from './service';

describe('payments service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findAllPayments calls Payment.find({})', () => {
    PaymentMock.find.mockReturnValue([]);
    findAllPayments();
    expect(PaymentMock.find).toHaveBeenCalledWith({});
  });

  it('findPaymentsByTenant queries by tenantId', () => {
    PaymentMock.find.mockReturnValue([]);
    findPaymentsByTenant('tenant-1');
    expect(PaymentMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
  });

  it('findPaymentByIdInTenant queries by id and tenantId', () => {
    PaymentMock.findOne.mockReturnValue({ _id: 'p1' });
    findPaymentByIdInTenant('p1', 'tenant-1');
    expect(PaymentMock.findOne).toHaveBeenCalledWith({ _id: 'p1', tenantId: 'tenant-1' });
  });

  it('findPaymentById calls Payment.findById', () => {
    PaymentMock.findById.mockReturnValue({ _id: 'p1' });
    findPaymentById('p1');
    expect(PaymentMock.findById).toHaveBeenCalledWith('p1');
  });

  it('createPaymentInTenant persists payment with tenantId', async () => {
    const payload = { chargeId: 'c1', amount: 1200, userId: 'u1' };
    const result = await createPaymentInTenant(payload, 'tenant-1');
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ tenantId: 'tenant-1', chargeId: 'c1' }));
  });

  it('findPaymentByStripeSessionId queries by stripeSessionId', () => {
    PaymentMock.findOne.mockReturnValue({ _id: 'p1' });
    findPaymentByStripeSessionId('session-xyz');
    expect(PaymentMock.findOne).toHaveBeenCalledWith({ stripeSessionId: 'session-xyz' });
  });

  it('updatePaymentInTenant calls findOneAndUpdate with correct filter', () => {
    PaymentMock.findOneAndUpdate.mockReturnValue({ _id: 'p1', status: 'completed' });
    updatePaymentInTenant('p1', 'tenant-1', { status: 'completed' });
    expect(PaymentMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'p1', tenantId: 'tenant-1' },
      { status: 'completed' },
      { new: true }
    );
  });

  it('upsertPaymentByStripeSessionId calls findOneAndUpdate with upsert', () => {
    PaymentMock.findOneAndUpdate.mockReturnValue({ _id: 'p1' });
    upsertPaymentByStripeSessionId('session-abc', { amount: 100, status: 'paid' });
    expect(PaymentMock.findOneAndUpdate).toHaveBeenCalledWith(
      { stripeSessionId: 'session-abc' },
      { amount: 100, status: 'paid' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });

  it('deletePaymentInTenant calls findOneAndDelete', () => {
    PaymentMock.findOneAndDelete.mockReturnValue({ _id: 'p1' });
    deletePaymentInTenant('p1', 'tenant-1');
    expect(PaymentMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'p1', tenantId: 'tenant-1' });
  });
});
