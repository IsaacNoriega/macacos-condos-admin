import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

const config: CrudConfig = {
  title: 'Usuarios',
  endpoint: '/users',
  listKey: 'users',
  singularKey: 'user',
  fields: [
    { key: 'name', label: 'Nombre', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'password', label: 'Contraseña', type: 'text' },
    {
      key: 'role',
      label: 'Rol',
      type: 'select',
      required: true,
      options: [
        { label: 'SuperAdmin', value: 'superadmin' },
        { label: 'Admin', value: 'admin' },
        { label: 'Residente', value: 'residente' },
        { label: 'Familiar', value: 'familiar' },
      ],
    },
  ],
};

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CrudPageComponent],
  template: '<app-crud-page [config]="config" />',
})
export class UsersPage {
  readonly config = config;
}
