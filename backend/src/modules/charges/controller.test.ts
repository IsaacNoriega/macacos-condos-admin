import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./service', () => ({
  findAllCharges: vi.fn(),
  findChargesByTenant: vi.fn(),
  createChargeInTenant: vi.fn(),
  updateChargeInTenant: vi.fn(),
  deleteChargeInTenant: vi.fn(),
}));

vi.mock('../payments/model', () => {
  const findMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  });
  return { default: { find: findMock } };
});

import { createCharge, deleteCharge, getAllCharges, updateCharge } from './controller';
import {
  createChargeInTenant,
  deleteChargeInTenant,
  findChargesByTenant,
  updateChargeInTenant,
} from './service';
import Payment from '../payments/model';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

const mockFindChain = () => ({
  select: vi.fn().mockReturnValue({
    lean: vi.fn().mockResolvedValue([]),
  }),
});

describe('charges controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore Payment.find after clearAllMocks so enrichChargesWithPaymentStatus works
    vi.mocked(Payment.find as any).mockReturnValue(mockFindChain());
  });

  describe('getAllCharges', () => {
    it('returns charges scoped to tenant for admin role', async () => {
      vi.mocked(findChargesByTenant).mockResolvedValue([
        { _id: 'c1', amount: 1000, isPaid: false },
      ] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin', id: 'admin-1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllCharges(req, res, next);

      expect(findChargesByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('filters to own charges for residente role', async () => {
      vi.mocked(findChargesByTenant).mockResolvedValue([
        { _id: 'c1', userId: 'user-1', isPaid: false },
        { _id: 'c2', userId: 'user-2', isPaid: false },
      ] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'residente', id: 'user-1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllCharges(req, res, next);

      const callArg = vi.mocked(res.json).mock.calls[0][0];
      expect(callArg.charges).toHaveLength(1);
      expect(callArg.charges[0]._id).toBe('c1');
    });

    it('forwards error to next on service failure', async () => {
      vi.mocked(findChargesByTenant).mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllCharges(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createCharge', () => {
    it('creates charge in tenant and returns 201', async () => {
      vi.mocked(createChargeInTenant).mockResolvedValue({ _id: 'c3', amount: 500 } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { amount: 500, description: 'Maintenance fee', dueDate: '2026-05-01' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createCharge(req, res, next);

      expect(createChargeInTenant).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500, description: 'Maintenance fee' }),
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with error when tenantId cannot be determined', async () => {
      const req = mockRequest({
        tenantId: undefined,
        user: { id: 'admin-1', role: 'admin' },
        body: { amount: 500 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createCharge(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('updateCharge', () => {
    it('updates charge and responds with updated data', async () => {
      vi.mocked(updateChargeInTenant).mockResolvedValue({ _id: 'c1', amount: 600 } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'c1' },
        body: { amount: 600 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateCharge(req, res, next);

      expect(updateChargeInTenant).toHaveBeenCalledWith('c1', 'tenant-1', { amount: 600 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when charge not found', async () => {
      vi.mocked(updateChargeInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
        body: { amount: 100 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateCharge(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('deleteCharge', () => {
    it('deletes charge and returns success message', async () => {
      vi.mocked(deleteChargeInTenant).mockResolvedValue({ _id: 'c1' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'c1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteCharge(req, res, next);

      expect(deleteChargeInTenant).toHaveBeenCalledWith('c1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when charge not found', async () => {
      vi.mocked(deleteChargeInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteCharge(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
