import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

const config: CrudConfig = {
  title: 'Residentes',
  endpoint: '/residents',
  listKey: 'residents',
  singularKey: 'resident',
  fields: [
    { key: 'unitId', label: 'ID de unidad', type: 'text', required: true },
    { key: 'name', label: 'Nombre', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
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

@Component({
  selector: 'app-residents-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class ResidentsPage {
  readonly config = config;
}
