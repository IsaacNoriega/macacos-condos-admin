import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UsersPage } from './users.page';

describe('UsersPage form submission', () => {
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

    apiMock.get.mockReturnValue(of({ success: true, users: [] }));
    apiMock.post.mockReturnValue(of({ success: true }));
    apiMock.put.mockReturnValue(of({ success: true }));

    TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
  });

  it('creates user from form as admin', () => {
    const fixture = TestBed.createComponent(UsersPage);
    const component = fixture.componentInstance;

    component.form.patchValue({
      name: 'Nuevo Usuario',
      email: 'nuevo@correo.com',
      password: 'mock-password-123',
      role: 'residente',
      tenant: '',
    });

    component.saveUser();

    expect(apiMock.post).toHaveBeenCalledWith('/users', {
      name: 'Nuevo Usuario',
      email: 'nuevo@correo.com',
      role: 'residente',
      password: 'mock-password-123',
    });
  });

  it('creates user from form as superadmin with tenantId', () => {
    authMock.role.mockReturnValue('superadmin');
    authMock.user.mockReturnValue({ _id: 'u-super', tenantId: 'tenant-1', role: 'superadmin' });
    apiMock.get.mockReturnValueOnce(
      of({
        success: true,
        tenants: [{ _id: 'tenant-2', name: 'Condo 2', address: 'X', contactEmail: 'x@x.com' }],
      }),
    );

    const fixture = TestBed.createComponent(UsersPage);
    const component = fixture.componentInstance;

    component.form.patchValue({
      name: 'Admin Tenant',
      email: 'admin@tenant.com',
      password: 'mock-secure-pass',
      role: 'admin',
      tenant: 'tenant-2',
    });

    component.saveUser();

    expect(apiMock.post).toHaveBeenCalledWith('/users', {
      name: 'Admin Tenant',
      email: 'admin@tenant.com',
      role: 'admin',
      password: 'mock-secure-pass',
      tenantId: 'tenant-2',
    });
  });

  it('edits an existing user and sends PUT', () => {
    const fixture = TestBed.createComponent(UsersPage);
    const component = fixture.componentInstance;

    component.users.set([
      {
        id: 'user-1',
        tenantId: 'tenant-1',
        name: 'Usuario Original',
        email: 'original@correo.com',
        role: 'residente',
        tenant: 'Condominio 1',
        status: 'Activo',
        lastActivity: new Date('2026-04-01T00:00:00.000Z'),
        avatarBg: 'linear-gradient(180deg, #90b9d7, #4b7f9d)',
      },
    ]);
    component.selectedUserId.set('user-1');

    component.form.patchValue({
      name: 'Usuario Editado',
      email: 'editado@correo.com',
      password: 'mock-new-password',
      role: 'admin',
      tenant: '',
    });

    component.saveUser();

    expect(apiMock.put).toHaveBeenCalledWith('/users/user-1', {
      name: 'Usuario Editado',
      email: 'editado@correo.com',
      role: 'admin',
      password: 'mock-new-password',
    });
  });

  it('deletes a user and calls DELETE endpoint', () => {
    const fixture = TestBed.createComponent(UsersPage);
    const component = fixture.componentInstance;

    apiMock.delete.mockReturnValue(of({ success: true }));

    component.deleteUser({
      id: 'user-2',
      tenantId: 'tenant-1',
      name: 'Usuario Borrable',
      email: 'delete@correo.com',
      role: 'residente',
      tenant: 'Condominio 1',
      status: 'Activo',
      lastActivity: new Date('2026-04-01T00:00:00.000Z'),
      avatarBg: 'linear-gradient(180deg, #90b9d7, #4b7f9d)',
    });

    expect(apiMock.delete).toHaveBeenCalledWith('/users/user-2');
  });
});
