import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

@Component({
  selector: 'app-charges-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class ChargesPage {
  readonly config: CrudConfig;

  constructor(private readonly auth: AuthService) {
    const isSuperadmin = this.auth.role() === 'superadmin';

    this.config = {
      title: 'Cargos',
      endpoint: '/charges',
      listKey: 'charges',
      singularKey: 'charge',
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
        {
          key: 'unitId',
          label: 'Unidad',
          type: 'select',
          optionsSource: {
            endpoint: '/units',
            listKey: 'units',
            valueKey: '_id',
            labelKey: 'code',
            dependsOnTenant: true,
          },
        },
        {
          key: 'userId',
          label: 'Usuario',
          type: 'select',
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
        { key: 'description', label: 'Descripción', type: 'textarea', required: true },
        { key: 'amount', label: 'Monto', type: 'number', required: true },
        { key: 'dueDate', label: 'Fecha de vencimiento', type: 'date', required: true },
      ],
    };
  }
}
