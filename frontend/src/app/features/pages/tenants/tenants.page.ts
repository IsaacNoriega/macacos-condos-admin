import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

const config: CrudConfig = {
  title: 'Tenants (Condominios)',
  endpoint: '/tenants',
  listKey: 'tenants',
  singularKey: 'tenant',
  fields: [
    { key: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Condominio Vista Norte' },
    { key: 'address', label: 'Dirección', type: 'text', required: true },
    { key: 'contactEmail', label: 'Email de contacto', type: 'email', required: true },
  ],
};

@Component({
  selector: 'app-tenants-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class TenantsPage {
  readonly config = config;
}
