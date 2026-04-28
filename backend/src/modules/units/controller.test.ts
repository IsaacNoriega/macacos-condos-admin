import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
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
import {
  createUnitInTenant,
  deleteUnitInTenant,
  findAllUnits,
  findUnitByIdInTenant,
  findUnitsByTenant,
  updateUnitInTenant,
} from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('units controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUnits', () => {
    it('returns units scoped to tenant for non-superadmin', async () => {
      vi.mocked(findUnitsByTenant).mockResolvedValue([{ _id: 'u1', code: 'A-101' }] as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUnits(req, res, next);

      expect(findUnitsByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        units: [{ _id: 'u1', code: 'A-101' }],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns all units for superadmin without query tenantId', async () => {
      vi.mocked(findAllUnits).mockResolvedValue([{ _id: 'u2' }] as any);

      const req = mockRequest({
        tenantId: undefined,
        user: { role: 'superadmin' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUnits(req, res, next);

      expect(findAllUnits).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards error to next on service failure', async () => {
      vi.mocked(findUnitsByTenant).mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllUnits(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('getUnitById', () => {
    it('returns unit when found', async () => {
      vi.mocked(findUnitByIdInTenant).mockResolvedValue({ _id: 'u1', code: 'A-101' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        params: { id: 'u1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getUnitById(req, res, next);

      expect(findUnitByIdInTenant).toHaveBeenCalledWith('u1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when unit not found', async () => {
      vi.mocked(findUnitByIdInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        params: { id: 'nonexistent' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getUnitById(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createUnit', () => {
    it('creates unit in tenant and returns 201', async () => {
      vi.mocked(createUnitInTenant).mockResolvedValue({ _id: 'u3', code: 'B-202' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { code: 'B-202', floor: 2 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createUnit(req, res, next);

      expect(createUnitInTenant).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'B-202', floor: 2 }),
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with error when tenantId cannot be determined', async () => {
      const req = mockRequest({
        tenantId: undefined,
        user: { id: 'admin-1', role: 'admin' },
        body: { code: 'X-000' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createUnit(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('updateUnit', () => {
    it('updates unit and responds with updated data', async () => {
      vi.mocked(updateUnitInTenant).mockResolvedValue({ _id: 'u1', code: 'A-101-updated' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'u1' },
        query: {},
        body: { code: 'A-101-updated' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateUnit(req, res, next);

      expect(updateUnitInTenant).toHaveBeenCalledWith('u1', 'tenant-1', { code: 'A-101-updated' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when unit not found', async () => {
      vi.mocked(updateUnitInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
        query: {},
        body: { code: 'X' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateUnit(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('deleteUnit', () => {
    it('deletes unit and returns success message', async () => {
      vi.mocked(deleteUnitInTenant).mockResolvedValue({ _id: 'u1' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'u1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteUnit(req, res, next);

      expect(deleteUnitInTenant).toHaveBeenCalledWith('u1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when unit not found', async () => {
      vi.mocked(deleteUnitInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteUnit(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
