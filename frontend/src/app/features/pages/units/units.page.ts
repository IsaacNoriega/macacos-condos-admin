import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

const config: CrudConfig = {
  title: 'Unidades',
  endpoint: '/units',
  listKey: 'units',
  singularKey: 'unit',
  fields: [
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

@Component({
  selector: 'app-units-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class UnitsPage {
  readonly config = config;
}
