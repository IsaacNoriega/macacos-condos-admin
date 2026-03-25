import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class UsersPage {
  readonly config: CrudConfig;

  constructor(private readonly auth: AuthService) {
    const isSuperadmin = this.auth.role() === 'superadmin';

    this.config = {
      title: 'Usuarios',
      endpoint: '/users',
      listKey: 'users',
      singularKey: 'user',
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
        { key: 'name', label: 'Nombre', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'password', label: 'Contraseña', type: 'text' },
        {
          key: 'role',
          label: 'Rol',
          type: 'select',
          required: true,
          options: [
            { label: 'SuperAdmin', value: 'superadmin' },
            { label: 'Admin', value: 'admin' },
            { label: 'Residente', value: 'residente' },
            { label: 'Familiar', value: 'familiar' },
          ],
        },
      ],
    };
  }
}
