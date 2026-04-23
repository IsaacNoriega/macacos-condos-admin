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
  findChargeByIdInTenant: vi.fn(),
  createChargeInTenant: vi.fn(),
  updateChargeInTenant: vi.fn(),
  deleteChargeInTenant: vi.fn(),
}));

vi.mock('../payments/model', () => ({
  default: {
    find: vi.fn(),
  },
}));

import { createCharge, deleteCharge, getAllCharges, updateCharge } from './controller';
import * as chargesService from './service';
import PaymentModel from '../payments/model';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('charges controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAllCharges ────────────────────────────────────────────────────────────

  describe('getAllCharges', () => {
    it('returns empty array without payment enrichment when no charges', async () => {
      vi.mocked(chargesService.findChargesByTenant).mockResolvedValue([]);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllCharges(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, charges: [] });
    });

    it('returns charges for admin role with payment status enrichment', async () => {
      vi.mocked(chargesService.findChargesByTenant).mockResolvedValue([
        { _id: 'c1', isPaid: false } as any,
      ]);
      const leanMock = vi.fn().mockResolvedValue([]);
      const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
      vi.mocked(PaymentModel.find).mockReturnValue({ select: selectMock } as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllCharges(req, res, next);

      expect(chargesService.findChargesByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('returns superadmin all charges without queryTenantId', async () => {
      vi.mocked(chargesService.findAllCharges).mockResolvedValue([]);

      const req = mockRequest({ user: { role: 'superadmin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllCharges(req, res, next);

      expect(chargesService.findAllCharges).toHaveBeenCalled();
    });

    it('returns charges filtered by tenantId for superadmin with queryTenantId', async () => {
      vi.mocked(chargesService.findChargesByTenant).mockResolvedValue([]);

      const req = mockRequest({
        user: { role: 'superadmin' },
        query: { tenantId: 'tenant-2' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllCharges(req, res, next);

      expect(chargesService.findChargesByTenant).toHaveBeenCalledWith('tenant-2');
    });

    it('returns only own charges for residente role', async () => {
      vi.mocked(chargesService.findChargesByTenant).mockResolvedValue([
        { _id: 'c1', userId: 'user-1', isPaid: true } as any,
        { _id: 'c2', userId: 'user-2', isPaid: false } as any,
      ]);
      const leanMock = vi.fn().mockResolvedValue([]);
      const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
      vi.mocked(PaymentModel.find).mockReturnValue({ select: selectMock } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'residente', id: 'user-1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllCharges(req, res, next);

      expect(chargesService.findChargesByTenant).toHaveBeenCalledWith('tenant-1');
    });
  });

  // ─── createCharge ────────────────────────────────────────────────────────────

  describe('createCharge', () => {
    it('creates charge and returns 201', async () => {
      vi.mocked(chargesService.createChargeInTenant).mockResolvedValue({ _id: 'c1' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: {
          userId: 'u1',
          description: 'Cuota mensual',
          amount: 1200,
          dueDate: '2026-05-01',
        },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createCharge(req, res, next);

      expect(chargesService.createChargeInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when tenantId is missing', async () => {
      const req = mockRequest({
        user: { role: 'admin' },
        body: { description: 'Test' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createCharge(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── updateCharge ────────────────────────────────────────────────────────────

  describe('updateCharge', () => {
    it('updates charge and returns result', async () => {
      vi.mocked(chargesService.updateChargeInTenant).mockResolvedValue({ _id: 'c1', amount: 2000 } as any);

      const req = mockRequest({
        params: { id: 'c1' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { amount: 2000 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateCharge(req, res, next);

      expect(chargesService.updateChargeInTenant).toHaveBeenCalledWith('c1', 'tenant-1', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ success: true, charge: { _id: 'c1', amount: 2000 } });
    });

    it('calls next with 404 when charge not found', async () => {
      vi.mocked(chargesService.updateChargeInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { amount: 100 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateCharge(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── deleteCharge ────────────────────────────────────────────────────────────

  describe('deleteCharge', () => {
    it('deletes charge and returns success message', async () => {
      vi.mocked(chargesService.deleteChargeInTenant).mockResolvedValue({ _id: 'c1' } as any);

      const req = mockRequest({
        params: { id: 'c1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteCharge(req, res, next);

      expect(chargesService.deleteChargeInTenant).toHaveBeenCalledWith('c1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Cargo eliminado' });
    });

    it('calls next with 404 when charge not found on delete', async () => {
      vi.mocked(chargesService.deleteChargeInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteCharge(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
