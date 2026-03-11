import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { createReservationInTenant, findReservationConflict } from './service';

describe('reservations service', () => {
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

  it('createReservationInTenant persists reservation with tenant', async () => {
    const payload = { amenity: 'Gym', start: new Date(), end: new Date() };

    const created = await createReservationInTenant(payload, 'tenant-2');

    expect(saveMock).toHaveBeenCalled();
    expect(created).toEqual(expect.objectContaining({ tenantId: 'tenant-2' }));
  });
});
