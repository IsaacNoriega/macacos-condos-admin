import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

const config: CrudConfig = {
  title: 'Cargos',
  endpoint: '/charges',
  listKey: 'charges',
  singularKey: 'charge',
  fields: [
    { key: 'userId', label: 'ID de usuario', type: 'text', required: true },
    { key: 'description', label: 'Descripción', type: 'textarea', required: true },
    { key: 'amount', label: 'Monto', type: 'number', required: true },
    { key: 'dueDate', label: 'Fecha de vencimiento', type: 'date', required: true },
  ],
};

@Component({
  selector: 'app-charges-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class ChargesPage {
  readonly config = config;
}
