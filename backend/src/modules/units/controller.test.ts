import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn() },
}));

vi.mock('./service', () => ({
  findAllUnits: vi.fn(),
  findUnitsByTenant: vi.fn(),
  findUnitByIdInTenant: vi.fn(),
  createUnitInTenant: vi.fn(),
  updateUnitInTenant: vi.fn(),
  deleteUnitInTenant: vi.fn(),
}));

import { createUnit, deleteUnit, getAllUnits, getUnitById, updateUnit } from './controller';
import * as unitsService from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('units controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAllUnits ──────────────────────────────────────────────────────────────

  describe('getAllUnits', () => {
    it('returns tenant units for admin role', async () => {
      vi.mocked(unitsService.findUnitsByTenant).mockResolvedValue([
        { _id: 'u1', code: 'A-101' },
      ] as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUnits(req, res, next);

      expect(unitsService.findUnitsByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        units: [{ _id: 'u1', code: 'A-101' }],
      });
    });

    it('returns all units for superadmin without queryTenantId', async () => {
      vi.mocked(unitsService.findAllUnits).mockResolvedValue([]);

      const req = mockRequest({ user: { role: 'superadmin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUnits(req, res, next);

      expect(unitsService.findAllUnits).toHaveBeenCalled();
    });

    it('filters by queryTenantId for superadmin', async () => {
      vi.mocked(unitsService.findUnitsByTenant).mockResolvedValue([]);

      const req = mockRequest({
        user: { role: 'superadmin' },
        query: { tenantId: 'tenant-3' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUnits(req, res, next);

      expect(unitsService.findUnitsByTenant).toHaveBeenCalledWith('tenant-3');
    });
  });

  // ─── getUnitById ─────────────────────────────────────────────────────────────

  describe('getUnitById', () => {
    it('returns unit when found', async () => {
      vi.mocked(unitsService.findUnitByIdInTenant).mockResolvedValue({
        _id: 'u1',
        code: 'A-101',
      } as any);

      const req = mockRequest({ params: { id: 'u1' }, tenantId: 'tenant-1' } as any);
      const res = mockResponse();
      const next = mockNext();

      await getUnitById(req, res, next);

      expect(unitsService.findUnitByIdInTenant).toHaveBeenCalledWith('u1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, unit: { _id: 'u1', code: 'A-101' } });
    });

    it('calls next with 404 when unit not found', async () => {
      vi.mocked(unitsService.findUnitByIdInTenant).mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'ghost' }, tenantId: 'tenant-1' } as any);
      const res = mockResponse();
      const next = mockNext();

      await getUnitById(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── createUnit ──────────────────────────────────────────────────────────────

  describe('createUnit', () => {
    it('creates unit and returns 201', async () => {
      vi.mocked(unitsService.createUnitInTenant).mockResolvedValue({
        _id: 'u1',
        code: 'B-202',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { code: 'B-202', floor: 2 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createUnit(req, res, next);

      expect(unitsService.createUnitInTenant).toHaveBeenCalledWith(
        { code: 'B-202', floor: 2 },
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when tenantId is missing', async () => {
      const req = mockRequest({
        user: { role: 'admin' },
        body: { code: 'C-303' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createUnit(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── updateUnit ──────────────────────────────────────────────────────────────

  describe('updateUnit', () => {
    it('updates unit and returns result', async () => {
      vi.mocked(unitsService.updateUnitInTenant).mockResolvedValue({
        _id: 'u1',
        code: 'A-101-updated',
      } as any);

      const req = mockRequest({
        params: { id: 'u1' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { code: 'A-101-updated' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateUnit(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        unit: { _id: 'u1', code: 'A-101-updated' },
      });
    });

    it('calls next with 404 when unit not found', async () => {
      vi.mocked(unitsService.updateUnitInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { code: 'X' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateUnit(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── deleteUnit ──────────────────────────────────────────────────────────────

  describe('deleteUnit', () => {
    it('deletes unit and returns success message', async () => {
      vi.mocked(unitsService.deleteUnitInTenant).mockResolvedValue({ _id: 'u1' } as any);

      const req = mockRequest({
        params: { id: 'u1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteUnit(req, res, next);

      expect(unitsService.deleteUnitInTenant).toHaveBeenCalledWith('u1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Unidad eliminada' });
    });

    it('calls next with 404 when unit not found', async () => {
      vi.mocked(unitsService.deleteUnitInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteUnit(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
