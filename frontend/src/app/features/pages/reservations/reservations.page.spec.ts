import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationsPage } from './reservations.page';

describe('ReservationsPage behaviors', () => {
  const apiMock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const authMock = {
    role: vi.fn(),
    user: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.role.mockReturnValue('admin');
    authMock.user.mockReturnValue({ _id: 'u-admin', tenantId: 'tenant-1', role: 'admin' });

    apiMock.get.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/reservations')) {
        return of({ success: true, reservations: [] });
      }
      if (endpoint === '/tenants') {
        return of({ success: true, tenants: [] });
      }
      return of({ success: true });
    });

    TestBed.configureTestingModule({
      imports: [ReservationsPage],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
  });

  it('loads reservations on init (mostrar)', () => {
    const fixture = TestBed.createComponent(ReservationsPage);
    const component = fixture.componentInstance;

    component.ngOnInit();

    expect(apiMock.get).toHaveBeenCalledWith('/reservations');
    component.ngOnDestroy();
  });

  it('loads tenants for superadmin on init', () => {
    authMock.role.mockReturnValue('superadmin');

    const fixture = TestBed.createComponent(ReservationsPage);
    const component = fixture.componentInstance;

    component.ngOnInit();

    expect(apiMock.get).toHaveBeenCalledWith('/tenants');
    component.ngOnDestroy();
  });

  it('applies tenant filter query for superadmin calendar', () => {
    authMock.role.mockReturnValue('superadmin');

    const fixture = TestBed.createComponent(ReservationsPage);
    const component = fixture.componentInstance;

    component.calendarForm.patchValue({ tenantId: 'tenant-99' });
    component.applyCalendarFilters();

    expect(apiMock.get).toHaveBeenCalledWith('/reservations?tenantId=tenant-99');
    component.ngOnDestroy();
  });

  it('marks calendar event as finalizada when end date is in the past', () => {
    const fixture = TestBed.createComponent(ReservationsPage);
    const component = fixture.componentInstance;

    component.calendarForm.patchValue({ weekStart: '2026-04-06', amenity: '' });
    component.nowTick.set(new Date('2026-04-07T12:00:00.000Z').getTime());
    component.reservations.set([
      {
        _id: 'r1',
        tenantId: 'tenant-1',
        userId: 'u1',
        amenity: 'Piscina',
        start: '2026-04-07T09:00:00.000Z',
        end: '2026-04-07T10:00:00.000Z',
        status: 'activa',
      },
    ]);

    const days = component.calendarDays();
    const dayWithEvent = days.find((day) => day.events.length > 0);

    expect(dayWithEvent?.events[0]?.status).toBe('finalizada');
    component.ngOnDestroy();
  });
});
