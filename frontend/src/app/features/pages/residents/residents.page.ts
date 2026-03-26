import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

@Component({
  selector: 'app-residents-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class ResidentsPage {
  readonly config: CrudConfig;

  constructor(private readonly auth: AuthService) {
    const isSuperadmin = this.auth.role() === 'superadmin';

    this.config = {
      title: 'Residentes',
      endpoint: '/residents',
      listKey: 'residents',
      singularKey: 'resident',
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
          required: true,
          optionsSource: {
            endpoint: '/units',
            listKey: 'units',
            valueKey: '_id',
            labelKey: 'code',
          },
        },
        {
          key: 'email',
          label: 'Residente (usuario)',
          type: 'select',
          required: true,
          optionsSource: {
            endpoint: '/users',
            listKey: 'users',
            valueKey: 'email',
            labelKey: 'name',
            labelSecondaryKey: 'email',
            filterBy: {
              key: 'role',
              values: ['residente', 'familiar'],
            },
          },
          autoFill: [{ targetKey: 'name', sourceKey: 'name' }],
        },
        { key: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Se autocompleta al seleccionar usuario' },
        { key: 'phone', label: 'Teléfono', type: 'text' },
        {
          key: 'relationship',
          label: 'Relación',
          type: 'select',
          required: true,
          options: [
            { label: 'Propietario', value: 'propietario' },
            { label: 'Familiar', value: 'familiar' },
            { label: 'Inquilino', value: 'inquilino' },
          ],
        },
      ],
    };
  }
}
