import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { CrudConfig } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { CrudPageComponent } from './crud-page.component';

describe('CrudPageComponent form submissions', () => {
  const apiMock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.get.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/tenants')) {
        return of({ tenants: [] });
      }
      if (endpoint.startsWith('/users')) {
        return of({ users: [] });
      }
      if (endpoint.startsWith('/units')) {
        return of({ units: [] });
      }
      if (endpoint.startsWith('/amenities')) {
        return of({ amenities: [] });
      }
      if (endpoint.startsWith('/charges')) {
        return of({ charges: [] });
      }
      if (endpoint.startsWith('/maintenance')) {
        return of({ reports: [] });
      }
      if (endpoint.startsWith('/reservations')) {
        return of({ reservations: [] });
      }
      return of({});
    });
    apiMock.post.mockReturnValue(of({ success: true }));
    apiMock.put.mockReturnValue(of({ success: true }));
    apiMock.delete.mockReturnValue(of({ success: true }));

    TestBed.configureTestingModule({
      imports: [CrudPageComponent],
      providers: [{ provide: ApiService, useValue: apiMock }],
    });
  });

  const setup = (config: CrudConfig) => {
    const fixture = TestBed.createComponent(CrudPageComponent);
    fixture.componentInstance.config = config;
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  it('submits create tenant form', () => {
    const component = setup({
      title: 'Inquilinos',
      endpoint: '/tenants',
      listKey: 'tenants',
      singularKey: 'tenant',
      fields: [
        { key: 'name', label: 'Nombre', type: 'text', required: true },
        { key: 'address', label: 'Direccion', type: 'text', required: true },
        { key: 'contactEmail', label: 'Email', type: 'email', required: true },
      ],
    });

    component.form.patchValue({
      name: 'Condominio Norte',
      address: 'Av Siempre Viva 123',
      contactEmail: 'contacto@condo.com',
    });

    component.submit();

    expect(apiMock.post).toHaveBeenCalledWith('/tenants', {
      name: 'Condominio Norte',
      address: 'Av Siempre Viva 123',
      contactEmail: 'contacto@condo.com',
    });
  });

  it('loads list data (mostrar) for tenants, charges, maintenance and reservations', () => {
    setup({
      title: 'Inquilinos',
      endpoint: '/tenants',
      listKey: 'tenants',
      singularKey: 'tenant',
      fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }],
    });

    setup({
      title: 'Cargos',
      endpoint: '/charges',
      listKey: 'charges',
      singularKey: 'charge',
      fields: [{ key: 'description', label: 'Descripcion', type: 'textarea', required: true }],
    });

    setup({
      title: 'Mantenimiento',
      endpoint: '/maintenance',
      listKey: 'reports',
      singularKey: 'report',
      fields: [{ key: 'description', label: 'Descripcion', type: 'textarea', required: true }],
    });

    setup({
      title: 'Reservaciones',
      endpoint: '/reservations',
      listKey: 'reservations',
      singularKey: 'reservation',
      fields: [{ key: 'amenity', label: 'Amenidad', type: 'text', required: true }],
    });

    expect(apiMock.get).toHaveBeenCalledWith('/tenants');
    expect(apiMock.get).toHaveBeenCalledWith('/charges');
    expect(apiMock.get).toHaveBeenCalledWith('/maintenance');
    expect(apiMock.get).toHaveBeenCalledWith('/reservations');
  });

  it('submits create charge form', () => {
    const component = setup({
      title: 'Cargos',
      endpoint: '/charges',
      listKey: 'charges',
      singularKey: 'charge',
      fields: [
        { key: 'userId', label: 'Usuario', type: 'text', required: true },
        { key: 'description', label: 'Descripcion', type: 'textarea', required: true },
        { key: 'amount', label: 'Monto', type: 'number', required: true },
        { key: 'dueDate', label: 'Fecha', type: 'date', required: true },
      ],
    });

    component.form.patchValue({
      userId: '507f1f77bcf86cd799439012',
      description: 'Cuota mensual',
      amount: 1500,
      dueDate: '2026-05-01',
    });

    component.submit();

    expect(apiMock.post).toHaveBeenCalledWith('/charges', {
      userId: '507f1f77bcf86cd799439012',
      description: 'Cuota mensual',
      amount: 1500,
      dueDate: '2026-05-01',
    });
  });

  it('submits create maintenance form', () => {
    const component = setup({
      title: 'Mantenimiento',
      endpoint: '/maintenance',
      listKey: 'reports',
      singularKey: 'report',
      fields: [{ key: 'description', label: 'Descripcion', type: 'textarea', required: true }],
    });

    component.form.patchValue({ description: 'Fuga de agua en lobby' });

    component.submit();

    expect(apiMock.post).toHaveBeenCalledWith('/maintenance', {
      description: 'Fuga de agua en lobby',
    });
  });

  it('submits create reservation form', () => {
    const component = setup({
      title: 'Reservaciones',
      endpoint: '/reservations',
      listKey: 'reservations',
      singularKey: 'reservation',
      fields: [
        { key: 'amenity', label: 'Amenidad', type: 'text', required: true },
        { key: 'start', label: 'Inicio', type: 'datetime-local', required: true },
        { key: 'end', label: 'Fin', type: 'datetime-local', required: true },
      ],
    });

    component.form.patchValue({
      amenity: 'Piscina',
      start: '2026-05-01T10:00',
      end: '2026-05-01T11:00',
    });

    component.submit();

    expect(apiMock.post).toHaveBeenCalledWith('/reservations', {
      amenity: 'Piscina',
      start: '2026-05-01T10:00',
      end: '2026-05-01T11:00',
    });
  });

  it('does not submit when required fields are missing', () => {
    const component = setup({
      title: 'Inquilinos',
      endpoint: '/tenants',
      listKey: 'tenants',
      singularKey: 'tenant',
      fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }],
    });

    component.form.patchValue({ name: '' });

    component.submit();

    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('submits edit form with PUT when editingId exists', () => {
    const component = setup({
      title: 'Inquilinos',
      endpoint: '/tenants',
      listKey: 'tenants',
      singularKey: 'tenant',
      fields: [
        { key: 'name', label: 'Nombre', type: 'text', required: true },
        { key: 'address', label: 'Direccion', type: 'text', required: true },
      ],
    });

    component.startEdit({ _id: 'tenant-1', name: 'Condominio Viejo', address: 'Calle 1' });
    component.form.patchValue({
      name: 'Condominio Editado',
      address: 'Calle Actualizada 123',
    });

    component.submit();

    expect(apiMock.put).toHaveBeenCalledWith('/tenants/tenant-1', {
      name: 'Condominio Editado',
      address: 'Calle Actualizada 123',
    });
  });

  it('deletes an item with DELETE endpoint', () => {
    const component = setup({
      title: 'Inquilinos',
      endpoint: '/tenants',
      listKey: 'tenants',
      singularKey: 'tenant',
      fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }],
    });

    component.deleteItem({ _id: 'tenant-99', name: 'Condominio 99' });

    expect(apiMock.delete).toHaveBeenCalledWith('/tenants/tenant-99');
  });
});
