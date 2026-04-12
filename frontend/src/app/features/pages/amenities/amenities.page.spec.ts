import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AmenitiesPage } from './amenities.page';

describe('AmenitiesPage CRUD operations', () => {
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
      if (endpoint === '/amenities') {
        return of({ success: true, amenities: [] });
      }
      if (endpoint === '/tenants') {
        return of({ success: true, tenants: [] });
      }
      return of({ success: true });
    });
    apiMock.post.mockReturnValue(of({ success: true }));
    apiMock.put.mockReturnValue(of({ success: true }));
    apiMock.delete.mockReturnValue(of({ success: true }));

    TestBed.configureTestingModule({
      imports: [AmenitiesPage],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
  });

  it('loads amenities on init (mostrar)', () => {
    TestBed.createComponent(AmenitiesPage);

    expect(apiMock.get).toHaveBeenCalledWith('/amenities');
  });

  it('creates an amenity', () => {
    const fixture = TestBed.createComponent(AmenitiesPage);
    const component = fixture.componentInstance;

    component.form.patchValue({
      name: 'Gimnasio',
      description: 'Nuevo gimnasio',
      isActive: true,
    });

    component.saveAmenity();

    expect(apiMock.post).toHaveBeenCalledWith('/amenities', {
      name: 'Gimnasio',
      description: 'Nuevo gimnasio',
      isActive: true,
    });
  });

  it('edits an existing amenity', () => {
    const fixture = TestBed.createComponent(AmenitiesPage);
    const component = fixture.componentInstance;

    component.amenities.set([
      {
        id: 'amenity-1',
        tenantId: 'tenant-1',
        name: 'Alberca',
        description: 'Original',
        isActive: true,
        tenant: 'Condo 1',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        avatarBg: 'linear-gradient(180deg, #90b9d7, #4b7f9d)',
      },
    ]);
    component.selectedAmenityId.set('amenity-1');

    component.form.patchValue({
      name: 'Alberca Techada',
      description: 'Actualizada',
      isActive: false,
    });

    component.saveAmenity();

    expect(apiMock.put).toHaveBeenCalledWith('/amenities/amenity-1', {
      name: 'Alberca Techada',
      description: 'Actualizada',
      isActive: false,
    });
  });

  it('deletes an amenity', () => {
    const fixture = TestBed.createComponent(AmenitiesPage);
    const component = fixture.componentInstance;

    component.deleteAmenity({
      id: 'amenity-2',
      tenantId: 'tenant-1',
      name: 'Asador',
      description: 'Borrable',
      isActive: true,
      tenant: 'Condo 1',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      avatarBg: 'linear-gradient(180deg, #90b9d7, #4b7f9d)',
    });

    expect(apiMock.delete).toHaveBeenCalledWith('/amenities/amenity-2');
  });
});
