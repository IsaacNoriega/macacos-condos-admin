import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

@Component({
  selector: 'app-amenities-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class AmenitiesPage {
  readonly config: CrudConfig;

  constructor(private readonly auth: AuthService) {
    const isSuperadmin = this.auth.role() === 'superadmin';

    this.config = {
      title: 'Amenidades',
      endpoint: '/amenities',
      listKey: 'amenities',
      singularKey: 'amenity',
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
        { key: 'description', label: 'Descripción', type: 'textarea' },
      ],
    };
  }
}
