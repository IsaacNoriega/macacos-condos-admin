import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

@Component({
  selector: 'app-units-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class UnitsPage {
  readonly config: CrudConfig;

  constructor(private readonly auth: AuthService) {
    const isSuperadmin = this.auth.role() === 'superadmin';

    this.config = {
      title: 'Unidades',
      endpoint: '/units',
      listKey: 'units',
      singularKey: 'unit',
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
        { key: 'code', label: 'Código', type: 'text', required: true },
        {
          key: 'type',
          label: 'Tipo',
          type: 'select',
          required: true,
          options: [
            { label: 'Departamento', value: 'departamento' },
            { label: 'Casa', value: 'casa' },
          ],
        },
        { key: 'description', label: 'Descripción', type: 'textarea' },
      ],
    };
  }
}
