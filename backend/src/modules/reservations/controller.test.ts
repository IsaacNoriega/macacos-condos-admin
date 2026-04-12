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

import { createReservation, getAllReservations } from './controller';
import { createReservationInTenant, findReservationConflict, findReservationsByTenant } from './service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('reservations controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllReservations returns data from service', async () => {
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

  it('createReservation sends conflict to error middleware when overlap exists', async () => {
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

  it('createReservation persists reservation when there is no conflict', async () => {
    vi.mocked(findReservationConflict).mockResolvedValue(null as any);
    vi.mocked(createReservationInTenant).mockResolvedValue({ _id: 'r2', amenity: 'Gym' } as any);

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
});
