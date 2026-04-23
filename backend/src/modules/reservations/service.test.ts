import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getReservationDisplayStatus, serializeReservation } from './service';

// ─── Tests de funciones puras (sin mock de modelo) ───────────────────────────

describe('reservations service (pure functions)', () => {
  describe('getReservationDisplayStatus', () => {
    it('returns "cancelada" when status is cancelada', () => {
      const result = getReservationDisplayStatus({
        status: 'cancelada',
        end: '2025-01-01T00:00:00.000Z',
      });
      expect(result).toBe('cancelada');
    });

    it('returns "finalizada" when reservation has ended', () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const result = getReservationDisplayStatus(
        { status: 'activa', end: past.toISOString() },
        new Date('2025-01-01T00:00:00.000Z')
      );
      expect(result).toBe('finalizada');
    });

    it('returns "activa" when reservation is still ongoing', () => {
      const future = new Date('2099-01-01T00:00:00.000Z');
      const result = getReservationDisplayStatus(
        { status: 'activa', end: future.toISOString() },
        new Date()
      );
      expect(result).toBe('activa');
    });

    it('returns "activa" when end date is invalid', () => {
      const result = getReservationDisplayStatus({
        status: 'activa',
        end: 'not-a-date',
      });
      expect(result).toBe('activa');
    });
  });

  describe('serializeReservation', () => {
    it('includes currentStatus in serialized output', () => {
      const reservation = {
        _id: 'r1',
        amenity: 'Pool',
        status: 'activa' as const,
        end: new Date('2099-01-01'),
      };

      const result = serializeReservation(reservation);

      expect(result).toEqual(
        expect.objectContaining({
          _id: 'r1',
          amenity: 'Pool',
          currentStatus: 'activa',
        })
      );
    });

    it('calls toObject when available (Mongoose document)', () => {
      const toObject = vi.fn().mockReturnValue({
        _id: 'r2',
        status: 'cancelada',
        end: new Date(),
      });
      const doc = { toObject };

      const result = serializeReservation(doc);

      expect(toObject).toHaveBeenCalled();
      expect(result.currentStatus).toBe('cancelada');
    });
  });
});

// ─── Tests de funciones con modelo mockeado ───────────────────────────────────

const { saveMock, ReservationMock } = vi.hoisted(() => {
  const saveMock = vi.fn();

  class ReservationMock {
    static find = vi.fn();
    static findOne = vi.fn();
    static findOneAndUpdate = vi.fn();
    static findOneAndDelete = vi.fn();

    [key: string]: unknown;

    constructor(payload: Record<string, unknown>) {
      Object.assign(this, payload);
      this.save = saveMock;
    }

    save: () => Promise<void>;
  }

  return { saveMock, ReservationMock };
});

vi.mock('./model', () => ({
  __esModule: true,
  default: ReservationMock,
}));

import {
  createReservationInTenant,
  deleteReservationInTenant,
  findReservationConflict,
  findReservationsByTenant,
  updateReservationInTenant,
} from './service';

describe('reservations service (with model mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
  });

  it('findReservationConflict builds overlap query with exclusion', () => {
    const lean = vi.fn();
    ReservationMock.findOne.mockReturnValue({ lean });

    const start = new Date('2026-03-10T10:00:00.000Z');
    const end = new Date('2026-03-10T11:00:00.000Z');

    findReservationConflict('tenant-1', 'Pool', start, end, 'res-1');

    expect(ReservationMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        amenity: 'Pool',
        status: 'activa',
        _id: { $ne: 'res-1' },
      })
    );
    expect(lean).toHaveBeenCalled();
  });

  it('findReservationConflict works without exclusion id', () => {
    const lean = vi.fn();
    ReservationMock.findOne.mockReturnValue({ lean });

    const start = new Date('2026-03-10T10:00:00.000Z');
    const end = new Date('2026-03-10T11:00:00.000Z');

    findReservationConflict('tenant-1', 'Pool', start, end);

    const callArg = ReservationMock.findOne.mock.calls[0][0];
    expect(callArg._id).toBeUndefined();
  });

  it('createReservationInTenant persists reservation with tenant', async () => {
    const payload = { amenity: 'Gym', start: new Date(), end: new Date() };

    const created = await createReservationInTenant(payload, 'tenant-2');

    expect(saveMock).toHaveBeenCalled();
    expect(created).toEqual(expect.objectContaining({ tenantId: 'tenant-2' }));
  });

  it('findReservationsByTenant queries by tenantId', () => {
    ReservationMock.find.mockReturnValue([]);

    findReservationsByTenant('tenant-1');

    expect(ReservationMock.find).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
  });

  it('updateReservationInTenant calls findOneAndUpdate', () => {
    ReservationMock.findOneAndUpdate.mockReturnValue({ _id: 'r1' });

    updateReservationInTenant('r1', 'tenant-1', { status: 'cancelada' });

    expect(ReservationMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'r1', tenantId: 'tenant-1' },
      { status: 'cancelada' },
      { new: true }
    );
  });

  it('deleteReservationInTenant calls findOneAndDelete', () => {
    ReservationMock.findOneAndDelete.mockReturnValue({ _id: 'r1' });

    deleteReservationInTenant('r1', 'tenant-1');

    expect(ReservationMock.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'r1',
      tenantId: 'tenant-1',
    });
  });
});
