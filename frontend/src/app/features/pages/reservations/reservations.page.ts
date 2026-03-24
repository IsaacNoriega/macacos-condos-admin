import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

const config: CrudConfig = {
  title: 'Reservaciones',
  endpoint: '/reservations',
  listKey: 'reservations',
  singularKey: 'reservation',
  fields: [
    { key: 'amenity', label: 'Amenidad', type: 'text', required: true },
    { key: 'start', label: 'Inicio', type: 'datetime-local', required: true },
    { key: 'end', label: 'Fin', type: 'datetime-local', required: true },
    {
      key: 'status',
      label: 'Estado',
      type: 'select',
      options: [
        { label: 'Activa', value: 'activa' },
        { label: 'Cancelada', value: 'cancelada' },
      ],
    },
  ],
};

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class ReservationsPage {
  readonly config = config;
}
