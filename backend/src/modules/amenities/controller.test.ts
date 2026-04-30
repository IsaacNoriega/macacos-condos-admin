import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./service', () => ({
  findAllAmenities: vi.fn(),
  findAmenitiesByTenant: vi.fn(),
  createAmenityInTenant: vi.fn(),
  updateAmenityInTenant: vi.fn(),
  deleteAmenityInTenant: vi.fn(),
}));

import { createAmenity, deleteAmenity, getAllAmenities, updateAmenity } from './controller';
import {
  createAmenityInTenant,
  deleteAmenityInTenant,
  findAmenitiesByTenant,
  updateAmenityInTenant,
} from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('amenities controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAmenities', () => {
    it('returns amenities scoped to tenant for non-superadmin', async () => {
      vi.mocked(findAmenitiesByTenant).mockResolvedValue([{ _id: 'a1', name: 'Pool' }] as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllAmenities(req, res, next);

      expect(findAmenitiesByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        amenities: [{ _id: 'a1', name: 'Pool' }],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns all amenities for superadmin without tenantId query', async () => {
      const { findAllAmenities } = await import('./service');
      vi.mocked(findAllAmenities).mockResolvedValue([{ _id: 'a2' }] as any);

      const req = mockRequest({
        tenantId: undefined,
        user: { role: 'superadmin' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllAmenities(req, res, next);

      expect(findAllAmenities).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards error to next on service failure', async () => {
      vi.mocked(findAmenitiesByTenant).mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllAmenities(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createAmenity', () => {
    it('creates amenity in tenant and returns 201', async () => {
      vi.mocked(createAmenityInTenant).mockResolvedValue({ _id: 'a3', name: 'Gym' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { name: 'Gym', description: 'Exercise room' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createAmenity(req, res, next);

      expect(createAmenityInTenant).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Gym', description: 'Exercise room' }),
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with error when tenantId cannot be determined', async () => {
      const req = mockRequest({
        tenantId: undefined,
        user: { id: 'admin-1', role: 'admin' },
        body: { name: 'Spa' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createAmenity(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('updateAmenity', () => {
    it('updates amenity and responds with updated data', async () => {
      vi.mocked(updateAmenityInTenant).mockResolvedValue({ _id: 'a1', name: 'Updated Pool' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'a1' },
        body: { name: 'Updated Pool' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateAmenity(req, res, next);

      expect(updateAmenityInTenant).toHaveBeenCalledWith('a1', 'tenant-1', { name: 'Updated Pool' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when amenity not found', async () => {
      vi.mocked(updateAmenityInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
        body: { name: 'X' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateAmenity(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('deleteAmenity', () => {
    it('deletes amenity and responds with success message', async () => {
      vi.mocked(deleteAmenityInTenant).mockResolvedValue({ _id: 'a1' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'a1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteAmenity(req, res, next);

      expect(deleteAmenityInTenant).toHaveBeenCalledWith('a1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when amenity not found', async () => {
      vi.mocked(deleteAmenityInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteAmenity(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
