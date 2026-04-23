import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./service', () => ({
  findAllMaintenance: vi.fn(),
  findMaintenanceByTenant: vi.fn(),
  findMaintenanceByIdInTenant: vi.fn(),
  createMaintenanceInTenant: vi.fn(),
  updateMaintenanceInTenant: vi.fn(),
  deleteMaintenanceInTenant: vi.fn(),
}));

import { createReport, deleteReport, getAllReports, updateReport } from './controller';
import * as maintenanceService from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('maintenance controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAllReports ────────────────────────────────────────────────────────────

  describe('getAllReports', () => {
    it('returns reports for admin role', async () => {
      vi.mocked(maintenanceService.findMaintenanceByTenant).mockResolvedValue([
        { _id: 'm1', title: 'Fuga de agua' },
      ] as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReports(req, res, next);

      expect(maintenanceService.findMaintenanceByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        reports: [{ _id: 'm1', title: 'Fuga de agua' }],
      });
    });

    it('returns all reports for superadmin without queryTenantId', async () => {
      vi.mocked(maintenanceService.findAllMaintenance).mockResolvedValue([]);

      const req = mockRequest({ user: { role: 'superadmin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReports(req, res, next);

      expect(maintenanceService.findAllMaintenance).toHaveBeenCalled();
    });

    it('returns reports filtered by queryTenantId for superadmin', async () => {
      vi.mocked(maintenanceService.findMaintenanceByTenant).mockResolvedValue([]);

      const req = mockRequest({
        user: { role: 'superadmin' },
        query: { tenantId: 'tenant-2' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReports(req, res, next);

      expect(maintenanceService.findMaintenanceByTenant).toHaveBeenCalledWith('tenant-2');
    });

    it('returns only own reports for residente role', async () => {
      vi.mocked(maintenanceService.findMaintenanceByTenant).mockResolvedValue([
        { _id: 'm1', userId: 'user-1' } as any,
        { _id: 'm2', userId: 'user-2' } as any,
      ]);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'residente', id: 'user-1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReports(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        reports: [{ _id: 'm1', userId: 'user-1' }],
      });
    });
  });

  // ─── createReport ────────────────────────────────────────────────────────────

  describe('createReport', () => {
    it('creates report and returns 201 for admin', async () => {
      vi.mocked(maintenanceService.createMaintenanceInTenant).mockResolvedValue({
        _id: 'm1',
        title: 'Fuga',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { title: 'Fuga', description: 'Hay una fuga', userId: 'u1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createReport(req, res, next);

      expect(maintenanceService.createMaintenanceInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('creates report using own userId for residente', async () => {
      vi.mocked(maintenanceService.createMaintenanceInTenant).mockResolvedValue({
        _id: 'm2',
        title: 'Luz',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'res-1', role: 'residente' },
        body: { title: 'Luz', description: 'No hay luz' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createReport(req, res, next);

      expect(maintenanceService.createMaintenanceInTenant).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'res-1' }),
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('calls next when tenantId is missing', async () => {
      const req = mockRequest({
        user: { role: 'admin' },
        body: { title: 'Test' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createReport(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── updateReport ────────────────────────────────────────────────────────────

  describe('updateReport', () => {
    it('updates report and returns result', async () => {
      vi.mocked(maintenanceService.updateMaintenanceInTenant).mockResolvedValue({
        _id: 'm1',
        status: 'resuelto',
      } as any);

      const req = mockRequest({
        params: { id: 'm1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { status: 'resuelto' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateReport(req, res, next);

      expect(maintenanceService.updateMaintenanceInTenant).toHaveBeenCalledWith('m1', 'tenant-1', { status: 'resuelto' });
      expect(res.json).toHaveBeenCalledWith({ success: true, report: { _id: 'm1', status: 'resuelto' } });
    });

    it('calls next with 404 when report not found', async () => {
      vi.mocked(maintenanceService.updateMaintenanceInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { status: 'resuelto' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateReport(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── deleteReport ────────────────────────────────────────────────────────────

  describe('deleteReport', () => {
    it('deletes report and returns success message', async () => {
      vi.mocked(maintenanceService.deleteMaintenanceInTenant).mockResolvedValue({ _id: 'm1' } as any);

      const req = mockRequest({
        params: { id: 'm1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteReport(req, res, next);

      expect(maintenanceService.deleteMaintenanceInTenant).toHaveBeenCalledWith('m1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Reporte eliminado' });
    });

    it('calls next with 404 when report not found on delete', async () => {
      vi.mocked(maintenanceService.deleteMaintenanceInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteReport(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
