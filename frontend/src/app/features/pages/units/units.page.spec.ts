import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UnitsPage } from './units.page';

describe('UnitsPage CRUD operations', () => {
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
      if (endpoint === '/units') {
        return of({ success: true, units: [] });
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
      imports: [UnitsPage],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
  });

  it('loads units on init (mostrar)', () => {
    TestBed.createComponent(UnitsPage);

    expect(apiMock.get).toHaveBeenCalledWith('/units');
  });

  it('creates a unit', () => {
    const fixture = TestBed.createComponent(UnitsPage);
    const component = fixture.componentInstance;

    component.form.patchValue({
      code: 'A-101',
      type: 'departamento',
      description: 'Unidad nueva',
      isActive: true,
    });

    component.saveUnit();

    expect(apiMock.post).toHaveBeenCalledWith('/units', {
      code: 'A-101',
      type: 'departamento',
      description: 'Unidad nueva',
      isActive: true,
    });
  });

  it('edits an existing unit', () => {
    const fixture = TestBed.createComponent(UnitsPage);
    const component = fixture.componentInstance;

    component.units.set([
      {
        id: 'unit-1',
        tenantId: 'tenant-1',
        code: 'A-101',
        type: 'departamento',
        description: 'Original',
        isActive: true,
        tenant: 'Condo 1',
        lastActivity: new Date('2026-04-01T00:00:00.000Z'),
        avatarBg: 'linear-gradient(180deg, #90b9d7, #4b7f9d)',
      },
    ]);
    component.selectedUnitId.set('unit-1');

    component.form.patchValue({
      code: 'A-102',
      type: 'casa',
      description: 'Actualizada',
      isActive: false,
    });

    component.saveUnit();

    expect(apiMock.put).toHaveBeenCalledWith('/units/unit-1', {
      code: 'A-102',
      type: 'casa',
      description: 'Actualizada',
      isActive: false,
    });
  });

  it('deletes a unit', () => {
    const fixture = TestBed.createComponent(UnitsPage);
    const component = fixture.componentInstance;

    component.deleteUnit({
      id: 'unit-2',
      tenantId: 'tenant-1',
      code: 'A-201',
      type: 'departamento',
      description: 'Borrable',
      isActive: true,
      tenant: 'Condo 1',
      lastActivity: new Date('2026-04-01T00:00:00.000Z'),
      avatarBg: 'linear-gradient(180deg, #90b9d7, #4b7f9d)',
    });

    expect(apiMock.delete).toHaveBeenCalledWith('/units/unit-2');
  });
});
