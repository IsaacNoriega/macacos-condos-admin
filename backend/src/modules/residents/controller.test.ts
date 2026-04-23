import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn() },
}));

vi.mock('./service', () => ({
  findResidentsByTenant: vi.fn(),
  findResidentByIdInTenant: vi.fn(),
  validateUnitInTenant: vi.fn(),
  countResidentsInUnit: vi.fn(),
  createResidentInTenant: vi.fn(),
  updateResidentInTenant: vi.fn(),
  deleteResidentInTenant: vi.fn(),
}));

vi.mock('../users/service', () => ({
  findUserByEmailInTenant: vi.fn(),
}));

import { createResident, deleteResident, getAllResidents, getResidentById, updateResident } from './controller';
import * as residentsService from './service';
import { findUserByEmailInTenant } from '../users/service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('residents controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllResidents', () => {
    it('returns all residents for admin role', async () => {
      vi.mocked(residentsService.findResidentsByTenant).mockResolvedValue([
        { _id: 'r1', email: 'alice@x.com' },
      ] as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllResidents(req, res, next);

      expect(residentsService.findResidentsByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, residents: [{ _id: 'r1', email: 'alice@x.com' }] });
    });

    it('filters by unitId query param', async () => {
      vi.mocked(residentsService.findResidentsByTenant).mockResolvedValue([
        { _id: 'r1', unitId: 'unit-1' },
        { _id: 'r2', unitId: 'unit-2' },
      ] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        query: { unitId: 'unit-1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllResidents(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        residents: [{ _id: 'r1', unitId: 'unit-1' }],
      });
    });

    it('uses queryTenantId for superadmin', async () => {
      vi.mocked(residentsService.findResidentsByTenant).mockResolvedValue([]);

      const req = mockRequest({
        user: { role: 'superadmin' },
        query: { tenantId: 'tenant-3' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllResidents(req, res, next);

      expect(residentsService.findResidentsByTenant).toHaveBeenCalledWith('tenant-3');
    });
  });

  describe('getResidentById', () => {
    it('returns resident when found', async () => {
      vi.mocked(residentsService.findResidentByIdInTenant).mockResolvedValue({
        _id: 'r1',
        email: 'alice@x.com',
      } as any);

      const req = mockRequest({ params: { id: 'r1' }, tenantId: 'tenant-1' } as any);
      const res = mockResponse();
      const next = mockNext();

      await getResidentById(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, resident: { _id: 'r1', email: 'alice@x.com' } });
    });

    it('calls next with 404 when not found', async () => {
      vi.mocked(residentsService.findResidentByIdInTenant).mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'ghost' }, tenantId: 'tenant-1' } as any);
      const res = mockResponse();
      const next = mockNext();

      await getResidentById(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createResident', () => {
    it('calls next when tenantId is missing', async () => {
      const req = mockRequest({
        user: { role: 'admin' },
        body: { unitId: 'u1', email: 'a@b.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when unit is invalid', async () => {
      vi.mocked(residentsService.validateUnitInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { unitId: 'bad', email: 'a@b.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when max residents exceeded', async () => {
      vi.mocked(residentsService.validateUnitInTenant).mockResolvedValue({ _id: 'u1' } as any);
      vi.mocked(residentsService.countResidentsInUnit).mockResolvedValue(5);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { unitId: 'u1', email: 'a@b.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when linked user does not exist', async () => {
      vi.mocked(residentsService.validateUnitInTenant).mockResolvedValue({ _id: 'u1' } as any);
      vi.mocked(residentsService.countResidentsInUnit).mockResolvedValue(0);
      vi.mocked(findUserByEmailInTenant).mockResolvedValue(null);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { unitId: 'u1', email: 'nobody@x.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('creates resident and returns 201 on success', async () => {
      vi.mocked(residentsService.validateUnitInTenant).mockResolvedValue({ _id: 'u1' } as any);
      vi.mocked(residentsService.countResidentsInUnit).mockResolvedValue(0);
      vi.mocked(findUserByEmailInTenant).mockResolvedValue({ _id: 'user-1', role: 'residente' } as any);
      vi.mocked(residentsService.createResidentInTenant).mockResolvedValue({ _id: 'res-1' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { unitId: 'u1', email: 'alice@x.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(residentsService.createResidentInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('updateResident', () => {
    it('calls next with 404 when resident not found', async () => {
      vi.mocked(residentsService.findResidentByIdInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('updates resident successfully', async () => {
      vi.mocked(residentsService.findResidentByIdInTenant).mockResolvedValue({
        _id: 'res-1',
        email: 'alice@x.com',
        relationship: 'propietario',
        unitId: { toString: () => 'u1' },
      } as any);
      vi.mocked(findUserByEmailInTenant).mockResolvedValue({ _id: 'user-1', role: 'residente' } as any);
      vi.mocked(residentsService.updateResidentInTenant).mockResolvedValue({ _id: 'res-1' } as any);

      const req = mockRequest({
        params: { id: 'res-1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateResident(req, res, next);

      expect(residentsService.updateResidentInTenant).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('deleteResident', () => {
    it('deletes resident and returns success', async () => {
      vi.mocked(residentsService.deleteResidentInTenant).mockResolvedValue({ _id: 'res-1' } as any);

      const req = mockRequest({
        params: { id: 'res-1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteResident(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Residente eliminado' });
    });

    it('calls next with 404 when not found', async () => {
      vi.mocked(residentsService.deleteResidentInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
