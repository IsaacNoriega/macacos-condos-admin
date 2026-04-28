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
  createMaintenanceInTenant: vi.fn(),
  updateMaintenanceInTenant: vi.fn(),
  deleteMaintenanceInTenant: vi.fn(),
}));

import { createReport, deleteReport, getAllReports, updateReport } from './controller';
import {
  createMaintenanceInTenant,
  deleteMaintenanceInTenant,
  findAllMaintenance,
  findMaintenanceByTenant,
  updateMaintenanceInTenant,
} from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('maintenance controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllReports', () => {
    it('returns reports scoped to tenant for admin role', async () => {
      vi.mocked(findMaintenanceByTenant).mockResolvedValue([
        { _id: 'm1', title: 'Broken pipe' },
      ] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin', id: 'admin-1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReports(req, res, next);

      expect(findMaintenanceByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        reports: [{ _id: 'm1', title: 'Broken pipe' }],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('filters to own reports for residente role', async () => {
      vi.mocked(findMaintenanceByTenant).mockResolvedValue([
        { _id: 'm1', userId: 'user-1', title: 'My issue' },
        { _id: 'm2', userId: 'user-2', title: 'Other issue' },
      ] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'residente', id: 'user-1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReports(req, res, next);

      const callArg = vi.mocked(res.json).mock.calls[0][0];
      expect(callArg.reports).toHaveLength(1);
      expect(callArg.reports[0]._id).toBe('m1');
    });

    it('returns all reports for superadmin', async () => {
      vi.mocked(findAllMaintenance).mockResolvedValue([{ _id: 'm1' }, { _id: 'm2' }] as any);

      const req = mockRequest({
        tenantId: undefined,
        user: { role: 'superadmin', id: 'sa-1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReports(req, res, next);

      expect(findAllMaintenance).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards error to next on service failure', async () => {
      vi.mocked(findMaintenanceByTenant).mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReports(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createReport', () => {
    it('creates report in tenant and returns 201', async () => {
      vi.mocked(createMaintenanceInTenant).mockResolvedValue({ _id: 'm3', title: 'Leak' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        body: { title: 'Leak', description: 'Water leak in bathroom' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createReport(req, res, next);

      expect(createMaintenanceInTenant).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Leak', userId: 'user-1' }),
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with error when tenantId cannot be determined for superadmin', async () => {
      const req = mockRequest({
        tenantId: undefined,
        user: { id: 'sa-1', role: 'superadmin' },
        body: { title: 'Global issue' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createReport(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('updateReport', () => {
    it('updates report and responds with updated data', async () => {
      vi.mocked(updateMaintenanceInTenant).mockResolvedValue({ _id: 'm1', status: 'resolved' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'm1' },
        body: { status: 'resolved' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateReport(req, res, next);

      expect(updateMaintenanceInTenant).toHaveBeenCalledWith('m1', 'tenant-1', { status: 'resolved' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when report not found', async () => {
      vi.mocked(updateMaintenanceInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
        body: { status: 'resolved' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateReport(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('deleteReport', () => {
    it('deletes report and returns success message', async () => {
      vi.mocked(deleteMaintenanceInTenant).mockResolvedValue({ _id: 'm1' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'm1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteReport(req, res, next);

      expect(deleteMaintenanceInTenant).toHaveBeenCalledWith('m1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when report not found', async () => {
      vi.mocked(deleteMaintenanceInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteReport(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
