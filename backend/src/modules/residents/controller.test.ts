import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
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

vi.mock('../tenants/service', () => ({
  findTenantById: vi.fn(),
}));

vi.mock('../../utils/notifications', () => ({
  sendWelcomeEmail: vi.fn(),
}));

import { createResident, deleteResident, getAllResidents, getResidentById, updateResident } from './controller';
import {
  countResidentsInUnit,
  createResidentInTenant,
  deleteResidentInTenant,
  findResidentByIdInTenant,
  findResidentsByTenant,
  updateResidentInTenant,
  validateUnitInTenant,
} from './service';
import { findUserByEmailInTenant } from '../users/service';
import { findTenantById } from '../tenants/service';
import { sendWelcomeEmail } from '../../utils/notifications';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('residents controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllResidents', () => {
    it('returns residents scoped to tenant', async () => {
      vi.mocked(findResidentsByTenant).mockResolvedValue([{ _id: 'r1', name: 'Alice' }] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllResidents(req, res, next);

      expect(findResidentsByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        residents: [{ _id: 'r1', name: 'Alice' }],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('filters by unitId when provided in query', async () => {
      vi.mocked(findResidentsByTenant).mockResolvedValue([
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

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          residents: [{ _id: 'r1', unitId: 'unit-1' }],
        })
      );
    });

    it('forwards error to next on service failure', async () => {
      vi.mocked(findResidentsByTenant).mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllResidents(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('getResidentById', () => {
    it('returns resident when found', async () => {
      vi.mocked(findResidentByIdInTenant).mockResolvedValue({ _id: 'r1', name: 'Alice' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        params: { id: 'r1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getResidentById(req, res, next);

      expect(findResidentByIdInTenant).toHaveBeenCalledWith('r1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when resident not found', async () => {
      vi.mocked(findResidentByIdInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        params: { id: 'nonexistent' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getResidentById(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createResident', () => {
    it('creates resident when all validations pass', async () => {
      vi.mocked(validateUnitInTenant).mockResolvedValue(true as any);
      vi.mocked(countResidentsInUnit).mockResolvedValue(2 as any);
      vi.mocked(findUserByEmailInTenant).mockResolvedValue({ _id: 'u1', name: 'Bob', role: 'residente' } as any);
      vi.mocked(findTenantById).mockResolvedValue({ _id: 'tenant-1', identifier: 'mac-1' } as any);
      vi.mocked(sendWelcomeEmail).mockResolvedValue(true as any);
      vi.mocked(createResidentInTenant).mockResolvedValue({ _id: 'r3', name: 'Bob' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: {
          unitId: 'unit-1',
          email: 'bob@example.com',
          relationship: 'propietario',
          name: 'Bob',
        },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(createResidentInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('creates resident when role is residente and relationship is familiar', async () => {
      vi.mocked(validateUnitInTenant).mockResolvedValue(true as any);
      vi.mocked(countResidentsInUnit).mockResolvedValue(2 as any);
      vi.mocked(findUserByEmailInTenant).mockResolvedValue({ _id: 'u1', name: 'Bob', role: 'residente' } as any);
      vi.mocked(findTenantById).mockResolvedValue({ _id: 'tenant-1', identifier: 'mac-1' } as any);
      vi.mocked(sendWelcomeEmail).mockResolvedValue(true as any);
      vi.mocked(createResidentInTenant).mockResolvedValue({ _id: 'r3', name: 'Bob' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: {
          unitId: 'unit-1',
          email: 'bob@example.com',
          relationship: 'familiar',
          name: 'Bob',
        },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(createResidentInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when unit does not belong to tenant', async () => {
      vi.mocked(validateUnitInTenant).mockResolvedValue(false as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { unitId: 'unit-bad', email: 'x@x.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when unit already has max residents', async () => {
      vi.mocked(validateUnitInTenant).mockResolvedValue(true as any);
      vi.mocked(countResidentsInUnit).mockResolvedValue(5 as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { unitId: 'unit-1', email: 'x@x.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when email does not correspond to a tenant user', async () => {
      vi.mocked(validateUnitInTenant).mockResolvedValue(true as any);
      vi.mocked(countResidentsInUnit).mockResolvedValue(1 as any);
      vi.mocked(findUserByEmailInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { unitId: 'unit-1', email: 'unknown@example.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when relationship does not match user role', async () => {
      vi.mocked(validateUnitInTenant).mockResolvedValue(true as any);
      vi.mocked(countResidentsInUnit).mockResolvedValue(1 as any);
      // familiar role is not allowed to have 'propietario' relationship
      vi.mocked(findUserByEmailInTenant).mockResolvedValue({ _id: 'u1', role: 'familiar' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { unitId: 'unit-1', email: 'fam@example.com', relationship: 'propietario' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('deleteResident', () => {
    it('deletes resident and returns success message', async () => {
      vi.mocked(deleteResidentInTenant).mockResolvedValue({ _id: 'r1' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'r1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteResident(req, res, next);

      expect(deleteResidentInTenant).toHaveBeenCalledWith('r1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when resident not found', async () => {
      vi.mocked(deleteResidentInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteResident(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
