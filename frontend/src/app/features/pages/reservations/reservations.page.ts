import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class ReservationsPage {
  readonly config: CrudConfig;

  constructor(private readonly auth: AuthService) {
    const role = this.auth.role();
    const isSuperadmin = role === 'superadmin';
    const isAdmin = role === 'admin';

    this.config = {
      title: 'Reservaciones',
      endpoint: '/reservations',
      listKey: 'reservations',
      singularKey: 'reservation',
      fields: [
        ...(isSuperadmin
          ? [
              {
                key: 'tenantId',
                label: 'Tenant',
                type: 'select' as const,
                required: true,
                optionsSource: {
                  endpoint: '/tenants',
                  listKey: 'tenants',
                  valueKey: '_id',
                  labelKey: 'name',
                  labelSecondaryKey: 'contactEmail',
                },
              },
            ]
          : []),
        ...(isSuperadmin || isAdmin
          ? [
              {
                key: 'userId',
                label: 'Usuario',
                type: 'select' as const,
                required: true,
                optionsSource: {
                  endpoint: '/users',
                  listKey: 'users',
                  valueKey: '_id',
                  labelKey: 'name',
                  labelSecondaryKey: 'email',
                  dependsOnTenant: true,
                },
              },
            ]
          : []),
        {
          key: 'amenity',
          label: 'Amenidad',
          type: 'select',
          required: true,
          optionsSource: {
            endpoint: '/amenities',
            listKey: 'amenities',
            valueKey: 'name',
            labelKey: 'name',
            dependsOnTenant: true,
          },
        },
        { key: 'start', label: 'Inicio', type: 'datetime-local', required: true },
        { key: 'end', label: 'Fin', type: 'datetime-local', required: true },
        ...(isSuperadmin || isAdmin
          ? [
              {
                key: 'status',
                label: 'Estado',
                type: 'select' as const,
                options: [
                  { label: 'Activa', value: 'activa' },
                  { label: 'Cancelada', value: 'cancelada' },
                ],
              },
            ]
          : []),
      ],
    };
  }
}
