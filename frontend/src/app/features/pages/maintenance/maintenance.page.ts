import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class MaintenancePage {
  readonly config: CrudConfig;

  constructor(private readonly auth: AuthService) {
    const role = this.auth.role();
    const isSuperadmin = role === 'superadmin';
    const isAdmin = role === 'admin';

    this.config = {
      title: 'Mantenimiento',
      endpoint: '/maintenance',
      listKey: 'reports',
      singularKey: 'report',
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
        { key: 'description', label: 'Descripción', type: 'textarea', required: true },
        ...(isSuperadmin || isAdmin
          ? [
              {
                key: 'status',
                label: 'Estado',
                type: 'select' as const,
                options: [
                  { label: 'Pendiente', value: 'pendiente' },
                  { label: 'En progreso', value: 'en progreso' },
                  { label: 'Resuelto', value: 'resuelto' },
                ],
              },
            ]
          : []),
      ],
    };
  }
}
