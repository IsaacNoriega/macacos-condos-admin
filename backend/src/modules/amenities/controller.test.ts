import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn() },
}));

vi.mock('./service', () => ({
  findAllAmenities: vi.fn(),
  findAmenitiesByTenant: vi.fn(),
  createAmenityInTenant: vi.fn(),
  updateAmenityInTenant: vi.fn(),
  deleteAmenityInTenant: vi.fn(),
}));

import { createAmenity, deleteAmenity, getAllAmenities, updateAmenity } from './controller';
import * as amenitiesService from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('amenities controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAllAmenities ──────────────────────────────────────────────────────────

  describe('getAllAmenities', () => {
    it('returns tenant amenities for admin role', async () => {
      vi.mocked(amenitiesService.findAmenitiesByTenant).mockResolvedValue([
        { _id: 'a1', name: 'Piscina' },
      ] as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllAmenities(req, res, next);

      expect(amenitiesService.findAmenitiesByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        amenities: [{ _id: 'a1', name: 'Piscina' }],
      });
    });

    it('returns all amenities for superadmin without queryTenantId', async () => {
      vi.mocked(amenitiesService.findAllAmenities).mockResolvedValue([]);

      const req = mockRequest({ user: { role: 'superadmin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllAmenities(req, res, next);

      expect(amenitiesService.findAllAmenities).toHaveBeenCalled();
    });

    it('returns filtered amenities for superadmin with queryTenantId', async () => {
      vi.mocked(amenitiesService.findAmenitiesByTenant).mockResolvedValue([]);

      const req = mockRequest({
        user: { role: 'superadmin' },
        query: { tenantId: 'tenant-2' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllAmenities(req, res, next);

      expect(amenitiesService.findAmenitiesByTenant).toHaveBeenCalledWith('tenant-2');
    });
  });

  // ─── createAmenity ───────────────────────────────────────────────────────────

  describe('createAmenity', () => {
    it('returns error when tenantId is missing', async () => {
      const req = mockRequest({
        user: { role: 'admin' },
        body: { name: 'Gym', maxDailyHours: 4 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createAmenity(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when maxDailyHours is invalid (< 1)', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { name: 'Gym', maxDailyHours: 0 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createAmenity(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when maxDailyHours is missing', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { name: 'Gym' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createAmenity(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('creates amenity and returns 201', async () => {
      vi.mocked(amenitiesService.createAmenityInTenant).mockResolvedValue({
        _id: 'a1',
        name: 'Gym',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { name: 'Gym', maxDailyHours: 4 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createAmenity(req, res, next);

      expect(amenitiesService.createAmenityInTenant).toHaveBeenCalledWith(
        { name: 'Gym', maxDailyHours: 4 },
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── updateAmenity ───────────────────────────────────────────────────────────

  describe('updateAmenity', () => {
    it('updates amenity and returns result', async () => {
      vi.mocked(amenitiesService.updateAmenityInTenant).mockResolvedValue({
        _id: 'a1',
        name: 'Piscina Actualizada',
      } as any);

      const req = mockRequest({
        params: { id: 'a1' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { name: 'Piscina Actualizada' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateAmenity(req, res, next);

      expect(amenitiesService.updateAmenityInTenant).toHaveBeenCalledWith('a1', 'tenant-1', { name: 'Piscina Actualizada' });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        amenity: { _id: 'a1', name: 'Piscina Actualizada' },
      });
    });

    it('calls next with 404 when amenity not found', async () => {
      vi.mocked(amenitiesService.updateAmenityInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { name: 'X' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateAmenity(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── deleteAmenity ───────────────────────────────────────────────────────────

  describe('deleteAmenity', () => {
    it('deletes amenity and returns success message', async () => {
      vi.mocked(amenitiesService.deleteAmenityInTenant).mockResolvedValue({ _id: 'a1' } as any);

      const req = mockRequest({
        params: { id: 'a1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteAmenity(req, res, next);

      expect(amenitiesService.deleteAmenityInTenant).toHaveBeenCalledWith('a1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Amenidad eliminada' });
    });

    it('calls next with 404 when amenity not found', async () => {
      vi.mocked(amenitiesService.deleteAmenityInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteAmenity(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
