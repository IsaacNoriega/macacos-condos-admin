import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./service', () => ({
  findAllTenants: vi.fn(),
  findTenantById: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
}));

import { createTenant, deleteTenant, getAllTenants, getTenantById, updateTenant } from './controller';
import {
  createTenant as createTenantService,
  deleteTenant as deleteTenantService,
  findAllTenants,
  findTenantById,
  updateTenant as updateTenantService,
} from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('tenants controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllTenants', () => {
    it('returns all tenants from service', async () => {
      vi.mocked(findAllTenants).mockResolvedValue([{ _id: 't1', name: 'Condo A' }] as any);

      const req = mockRequest({} as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllTenants(req, res, next);

      expect(findAllTenants).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        tenants: [{ _id: 't1', name: 'Condo A' }],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards error to next on service failure', async () => {
      vi.mocked(findAllTenants).mockRejectedValue(new Error('DB error'));

      const req = mockRequest({} as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllTenants(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('getTenantById', () => {
    it('returns tenant when found', async () => {
      vi.mocked(findTenantById).mockResolvedValue({ _id: 't1', name: 'Condo A' } as any);

      const req = mockRequest({ params: { id: 't1' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getTenantById(req, res, next);

      expect(findTenantById).toHaveBeenCalledWith('t1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when tenant not found', async () => {
      vi.mocked(findTenantById).mockResolvedValue(null as any);

      const req = mockRequest({ params: { id: 'nonexistent' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getTenantById(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createTenant', () => {
    it('creates tenant and returns 201', async () => {
      vi.mocked(createTenantService).mockResolvedValue({ _id: 't2', name: 'Condo B' } as any);

      const req = mockRequest({
        user: { id: 'admin-1' },
        body: { name: 'Condo B', domain: 'condo-b' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createTenant(req, res, next);

      expect(createTenantService).toHaveBeenCalledWith({ name: 'Condo B', domain: 'condo-b' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards error to next on service failure', async () => {
      vi.mocked(createTenantService).mockRejectedValue(new Error('Duplicate key'));

      const req = mockRequest({
        user: { id: 'admin-1' },
        body: { name: 'Condo B' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createTenant(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('updateTenant', () => {
    it('updates tenant and responds with updated data', async () => {
      vi.mocked(updateTenantService).mockResolvedValue({ _id: 't1', name: 'Renamed Condo' } as any);

      const req = mockRequest({
        user: { id: 'admin-1' },
        params: { id: 't1' },
        body: { name: 'Renamed Condo' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateTenant(req, res, next);

      expect(updateTenantService).toHaveBeenCalledWith('t1', { name: 'Renamed Condo' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when tenant not found', async () => {
      vi.mocked(updateTenantService).mockResolvedValue(null as any);

      const req = mockRequest({
        user: { id: 'admin-1' },
        params: { id: 'nonexistent' },
        body: { name: 'X' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateTenant(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('deleteTenant', () => {
    it('deletes tenant and returns success message', async () => {
      vi.mocked(deleteTenantService).mockResolvedValue({ _id: 't1' } as any);

      const req = mockRequest({
        user: { id: 'admin-1' },
        params: { id: 't1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteTenant(req, res, next);

      expect(deleteTenantService).toHaveBeenCalledWith('t1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when tenant not found', async () => {
      vi.mocked(deleteTenantService).mockResolvedValue(null as any);

      const req = mockRequest({
        user: { id: 'admin-1' },
        params: { id: 'nonexistent' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteTenant(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
