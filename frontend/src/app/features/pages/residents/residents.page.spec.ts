import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ResidentsPage } from './residents.page';

describe('ResidentsPage CRUD operations', () => {
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
      if (endpoint.startsWith('/tenants')) {
        return of({ success: true, tenants: [] });
      }
      if (endpoint === '/units') {
        return of({ success: true, units: [] });
      }
      if (endpoint === '/users') {
        return of({ success: true, users: [] });
      }
      if (endpoint === '/residents') {
        return of({ success: true, residents: [] });
      }
      return of({ success: true });
    });
    apiMock.post.mockReturnValue(of({ success: true }));
    apiMock.put.mockReturnValue(of({ success: true }));
    apiMock.delete.mockReturnValue(of({ success: true }));

    TestBed.configureTestingModule({
      imports: [ResidentsPage],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
  });

  it('loads residents on init (mostrar)', () => {
    TestBed.createComponent(ResidentsPage);

    expect(apiMock.get).toHaveBeenCalledWith('/residents');
  });

  it('creates a resident', () => {
    const fixture = TestBed.createComponent(ResidentsPage);
    const component = fixture.componentInstance;

    component.form.patchValue({
      unitId: 'unit-1',
      email: 'residente@correo.com',
      name: 'Residente Nuevo',
      phone: '5555555555',
      relationship: 'propietario',
      isActive: true,
    });

    component.saveResident();

    expect(apiMock.post).toHaveBeenCalledWith('/residents', {
      unitId: 'unit-1',
      email: 'residente@correo.com',
      name: 'Residente Nuevo',
      phone: '5555555555',
      relationship: 'propietario',
      isActive: true,
    });
  });

  it('edits an existing resident', () => {
    const fixture = TestBed.createComponent(ResidentsPage);
    const component = fixture.componentInstance;

    component.residents.set([
      {
        id: 'resident-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        name: 'Residente Original',
        email: 'original@correo.com',
        phone: '5550000000',
        relationship: 'propietario',
        status: 'Activo',
        tenant: 'Condo 1',
        unitCode: 'A-101',
        linkedRole: 'residente',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        avatarBg: 'linear-gradient(180deg, #90b9d7, #4b7f9d)',
      },
    ]);
    component.selectedResidentId.set('resident-1');

    component.form.patchValue({
      unitId: 'unit-2',
      email: 'editado@correo.com',
      name: 'Residente Editado',
      phone: '5551111111',
      relationship: 'inquilino',
      isActive: false,
    });

    component.saveResident();

    expect(apiMock.put).toHaveBeenCalledWith('/residents/resident-1', {
      unitId: 'unit-2',
      email: 'editado@correo.com',
      name: 'Residente Editado',
      phone: '5551111111',
      relationship: 'inquilino',
      isActive: false,
    });
  });

  it('deletes a resident', () => {
    const fixture = TestBed.createComponent(ResidentsPage);
    const component = fixture.componentInstance;

    component.deleteResident({
      id: 'resident-2',
      tenantId: 'tenant-1',
      unitId: 'unit-1',
      name: 'Residente Borrable',
      email: 'delete@correo.com',
      phone: '5559999999',
      relationship: 'familiar',
      status: 'Activo',
      tenant: 'Condo 1',
      unitCode: 'A-102',
      linkedRole: 'familiar',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      avatarBg: 'linear-gradient(180deg, #90b9d7, #4b7f9d)',
    });

    expect(apiMock.delete).toHaveBeenCalledWith('/residents/resident-2');
  });
});
