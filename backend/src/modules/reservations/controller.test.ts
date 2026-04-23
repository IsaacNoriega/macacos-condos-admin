import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./service', () => ({
  findAllReservations: vi.fn(),
  findReservationsByTenant: vi.fn(),
  findReservationByIdInTenant: vi.fn(),
  findReservationConflict: vi.fn(),
  createReservationInTenant: vi.fn(),
  updateReservationInTenant: vi.fn(),
  deleteReservationInTenant: vi.fn(),
  serializeReservation: vi.fn((reservation: any) => ({
    ...reservation,
    currentStatus: 'activa',
  })),
}));

vi.mock('../amenities/model', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock('./model', () => ({
  default: {
    find: vi.fn(),
  },
}));

import { createReservation, deleteReservation, getAllReservations, updateReservation } from './controller';
import {
  createReservationInTenant,
  deleteReservationInTenant,
  findReservationByIdInTenant,
  findReservationConflict,
  findReservationsByTenant,
  updateReservationInTenant,
} from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';
import AmenityModel from '../amenities/model';
import ReservationModel from './model';

describe('reservations controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAllReservations ───────────────────────────────────────────────────────

  describe('getAllReservations', () => {
    it('returns tenant reservations for regular user', async () => {
      vi.mocked(findReservationsByTenant).mockResolvedValue([{ _id: 'r1', amenity: 'Pool' }] as any);

      const req = mockRequest({ tenantId: 'tenant-1' } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllReservations(req, res, next);

      expect(findReservationsByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        reservations: [{ _id: 'r1', amenity: 'Pool', currentStatus: 'activa' }],
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── createReservation ───────────────────────────────────────────────────────

  describe('createReservation', () => {
    it('sends conflict error to next when overlap exists', async () => {
      vi.mocked(findReservationConflict).mockResolvedValue({ _id: 'existing' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1' },
        body: {
          amenity: 'Pool',
          start: '2026-03-10T10:00:00.000Z',
          end: '2026-03-10T11:00:00.000Z',
        },
      } as any);

      const res = mockResponse();
      const next = mockNext();

      await createReservation(req, res, next);

      expect(findReservationConflict).toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();
    });

    it('persists reservation when there is no conflict', async () => {
      vi.mocked(findReservationConflict).mockResolvedValue(null as any);
      vi.mocked(createReservationInTenant).mockResolvedValue({ _id: 'r2', amenity: 'Gym' } as any);
      vi.mocked(AmenityModel.findOne).mockResolvedValue({ maxDailyHours: 8 } as any);
      vi.mocked(ReservationModel.find).mockResolvedValue([] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1' },
        body: {
          amenity: 'Gym',
          start: '2026-03-10T12:00:00.000Z',
          end: '2026-03-10T13:00:00.000Z',
        },
      } as any);

      const res = mockResponse();
      const next = mockNext();

      await createReservation(req, res, next);

      expect(createReservationInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns error when start >= end', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1' },
        body: {
          amenity: 'Gym',
          start: '2026-03-10T13:00:00.000Z',
          end: '2026-03-10T12:00:00.000Z',
        },
      } as any);

      const res = mockResponse();
      const next = mockNext();

      await createReservation(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when amenity not found', async () => {
      vi.mocked(findReservationConflict).mockResolvedValue(null as any);
      vi.mocked(AmenityModel.findOne).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1' },
        body: {
          amenity: 'Nonexistent',
          start: '2026-03-10T12:00:00.000Z',
          end: '2026-03-10T13:00:00.000Z',
        },
      } as any);

      const res = mockResponse();
      const next = mockNext();

      await createReservation(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when daily hours limit is exceeded', async () => {
      vi.mocked(findReservationConflict).mockResolvedValue(null as any);
      vi.mocked(AmenityModel.findOne).mockResolvedValue({ maxDailyHours: 1 } as any);
      vi.mocked(ReservationModel.find).mockResolvedValue([
        {
          start: new Date('2026-03-10T08:00:00.000Z'),
          end: new Date('2026-03-10T09:00:00.000Z'),
        },
      ] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1' },
        body: {
          amenity: 'Gym',
          start: '2026-03-10T12:00:00.000Z',
          end: '2026-03-10T14:00:00.000Z',
        },
      } as any);

      const res = mockResponse();
      const next = mockNext();

      await createReservation(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── updateReservation ───────────────────────────────────────────────────────

  describe('updateReservation', () => {
    it('returns 404 when reservation not found', async () => {
      vi.mocked(findReservationByIdInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { status: 'cancelada' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateReservation(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('updates reservation for admin without conflict', async () => {
      vi.mocked(findReservationByIdInTenant).mockResolvedValue({
        _id: 'r1',
        amenity: 'Pool',
        start: new Date('2026-03-10T10:00:00.000Z'),
        end: new Date('2026-03-10T11:00:00.000Z'),
        userId: 'u1',
      } as any);
      vi.mocked(findReservationConflict).mockResolvedValue(null as any);
      vi.mocked(AmenityModel.findOne).mockResolvedValue({ maxDailyHours: 8 } as any);
      vi.mocked(ReservationModel.find).mockResolvedValue([] as any);
      vi.mocked(updateReservationInTenant).mockResolvedValue({ _id: 'r1', status: 'cancelada' } as any);

      const req = mockRequest({
        params: { id: 'r1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { status: 'cancelada' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updateReservation(req, res, next);

      expect(updateReservationInTenant).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ─── deleteReservation ───────────────────────────────────────────────────────

  describe('deleteReservation', () => {
    it('returns 404 when reservation not found for delete', async () => {
      vi.mocked(findReservationByIdInTenant).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: 'ghost' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteReservation(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('deletes reservation successfully', async () => {
      vi.mocked(findReservationByIdInTenant).mockResolvedValue({ _id: 'r1', userId: 'u1' } as any);
      vi.mocked(deleteReservationInTenant).mockResolvedValue({ _id: 'r1' } as any);

      const req = mockRequest({
        params: { id: 'r1' },
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deleteReservation(req, res, next);

      expect(deleteReservationInTenant).toHaveBeenCalledWith('r1', 'tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Reservación eliminada' });
    });
  });
});
