import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

const config: CrudConfig = {
  title: 'Mantenimiento',
  endpoint: '/maintenance',
  listKey: 'reports',
  singularKey: 'report',
  fields: [
    { key: 'userId', label: 'ID de usuario', type: 'text' },
    { key: 'description', label: 'Descripción', type: 'textarea', required: true },
    {
      key: 'status',
      label: 'Estado',
      type: 'select',
      options: [
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'En progreso', value: 'en progreso' },
        { label: 'Resuelto', value: 'resuelto' },
      ],
    },
  ],
};

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class MaintenancePage {
  readonly config = config;
}
