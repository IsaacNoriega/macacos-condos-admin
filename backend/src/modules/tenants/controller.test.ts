import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn() },
}));

vi.mock('./service', () => ({
  findAllTenants: vi.fn(),
  findTenantById: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
}));

import { createTenant, deleteTenant, getAllTenants, getTenantById, updateTenant } from './controller';
import * as tenantsService from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('tenants controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAllTenants ────────────────────────────────────────────────────────────

  describe('getAllTenants', () => {
    it('returns all tenants', async () => {
      vi.mocked(tenantsService.findAllTenants).mockResolvedValue([
        { _id: 't1', name: 'Condominios Macacos' },
      ] as any);

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await getAllTenants(req, res, next);

      expect(tenantsService.findAllTenants).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        tenants: [{ _id: 't1', name: 'Condominios Macacos' }],
      });
    });

    it('calls next on service error', async () => {
      vi.mocked(tenantsService.findAllTenants).mockRejectedValue(new Error('DB error'));

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await getAllTenants(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── getTenantById ───────────────────────────────────────────────────────────

  describe('getTenantById', () => {
    it('returns tenant when found', async () => {
      vi.mocked(tenantsService.findTenantById).mockResolvedValue({
        _id: 't1',
        name: 'Condominios Macacos',
      } as any);

      const req = mockRequest({ params: { id: 't1' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getTenantById(req, res, next);

      expect(tenantsService.findTenantById).toHaveBeenCalledWith('t1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        tenant: { _id: 't1', name: 'Condominios Macacos' },
      });
    });

    it('calls next with 404 when tenant not found', async () => {
      vi.mocked(tenantsService.findTenantById).mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'ghost' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getTenantById(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── createTenant ────────────────────────────────────────────────────────────

  describe('createTenant', () => {
    it('creates tenant and returns 201', async () => {
      vi.mocked(tenantsService.createTenant).mockResolvedValue({
        _id: 't1',
        name: 'Nuevo Condominio',
      } as any);

      const req = mockRequest({
        user: { id: 'superadmin-1' },
        body: { name: 'Nuevo Condominio', address: 'Av. Principal 123' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createTenant(req, res, next);

      expect(tenantsService.createTenant).toHaveBeenCalledWith({
        name: 'Nuevo Condominio',
        address: 'Av. Principal 123',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next on service error', async () => {
      vi.mocked(tenantsService.createTenant).mockRejectedValue(new Error('Duplicate key'));

      const req = mockRequest({ user: { id: 'sa-1' }, body: { name: 'Dup' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await createTenant(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── updateTenant ────────────────────────────────────────────────────────────

  describe('updateTenant', () => {
    it('updates tenant and returns result', async () => {
      vi.mocked(tenantsService.updateTenant).mockResolvedValue({
        _id: 't1',
        name: 'Condominios Actualizados',
      } as any);

      const req = mockRequest({
        params: { id: 't1' },
        user: { id: 'sa-1' },
        body: { name: 'Condominios Actualizados' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateTenant(req, res, next);

      expect(tenantsService.updateTenant).toHaveBeenCalledWith('t1', { name: 'Condominios Actualizados' });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('calls next with 404 when tenant not found', async () => {
      vi.mocked(tenantsService.updateTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        user: { id: 'sa-1' },
        body: { name: 'X' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateTenant(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── deleteTenant ────────────────────────────────────────────────────────────

  describe('deleteTenant', () => {
    it('deletes tenant and returns success message', async () => {
      vi.mocked(tenantsService.deleteTenant).mockResolvedValue({ _id: 't1' } as any);

      const req = mockRequest({
        params: { id: 't1' },
        user: { id: 'sa-1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteTenant(req, res, next);

      expect(tenantsService.deleteTenant).toHaveBeenCalledWith('t1');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Tenant eliminado' });
    });

    it('calls next with 404 when tenant not found', async () => {
      vi.mocked(tenantsService.deleteTenant).mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'ghost' }, user: { id: 'sa-1' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteTenant(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
