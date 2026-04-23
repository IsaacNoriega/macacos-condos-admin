import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { User as ApiUser, Tenant } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';

type UserRole = 'superadmin' | 'admin' | 'residente' | 'familiar';
type UserRoleFilter = 'all' | 'inquilinos' | 'residentes' | 'admin' | 'familiar' | 'superadmin';

interface UserCard {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  tenant: string;
  status: 'Activo' | 'Inactivo';
  lastActivity: Date;
  avatarBg: string;
}

interface RoleFilter {
  label: string;
  value: UserRoleFilter;
}

const ROLE_FILTERS: RoleFilter[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Inquilinos', value: 'inquilinos' },
  { label: 'Residentes', value: 'residentes' },
  { label: 'Admin', value: 'admin' },
  { label: 'Familiar', value: 'familiar' },
  { label: 'Superadmin', value: 'superadmin' },
];

const ROLE_OPTIONS = [
  { label: 'Superadmin', value: 'superadmin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Residente', value: 'residente' },
  { label: 'Familiar', value: 'familiar' },
];

const AVATAR_BACKGROUNDS = [
  'linear-gradient(180deg, #90b9d7, #4b7f9d)',
  'linear-gradient(180deg, #b6d5cf, #6d9d95)',
  'linear-gradient(180deg, #c9b4dd, #8d70a8)',
  'linear-gradient(180deg, #efd7aa, #c99b57)',
  'linear-gradient(180deg, #8ccad0, #2e7e88)',
  'linear-gradient(180deg, #d4a8a0, #a26156)',
  'linear-gradient(180deg, #a7c7ce, #5a8994)',
];

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FancySelectComponent],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css',
})
export class UsersPage {
  readonly roleFilters = ROLE_FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<UserRoleFilter>('all');
  readonly selectedUserId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly loading = signal(false);
  readonly lastSyncedAt = signal(new Date());
  readonly formMessage = signal<string | null>(null);
  readonly users = signal<UserCard[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly currentRole = computed(() => this.auth.role() ?? 'admin');
  readonly isSuperadmin = computed(() => this.currentRole() === 'superadmin');
  readonly tenantOptions = computed(() => this.tenants().map((tenant) => ({ label: tenant.name, value: tenant._id })));
  readonly roleOptions = ROLE_OPTIONS;
  readonly form: FormGroup;

  readonly selectedUser = computed(() => this.users().find((user) => user.id === this.selectedUserId()) ?? null);

  readonly filteredUsers = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.users().filter((user) => {
      const matchesQuery =
        !query ||
        [user.name, user.email, user.tenant, user.role, user.status]
          .join(' ')
          .toLowerCase()
          .includes(query);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'inquilinos' && user.tenant.toLowerCase().includes('condominio')) ||
        (filter === 'residentes' && user.role === 'residente') ||
        user.role === filter;

      return matchesQuery && matchesFilter;
    });
  });

  readonly pagedUsers = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));

  constructor(
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly api: ApiService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      role: ['admin' as UserRole, Validators.required],
      tenant: [''],
    });

    effect(() => {
      const selectedUser = this.selectedUser();
      if (!selectedUser) {
        this.form.reset(
          {
            name: '',
            email: '',
            password: '',
            role: 'admin',
            tenant: '',
          },
          { emitEvent: false }
        );
        return;
      }

      this.form.patchValue(
        {
          name: selectedUser.name,
          email: selectedUser.email,
          password: '',
          role: selectedUser.role,
          tenant: selectedUser.tenantId,
        },
        { emitEvent: false }
      );
    });

    effect(() => {
      const totalPages = this.totalPages();
      if (this.page() > totalPages) {
        this.page.set(totalPages);
      }
    });

    this.loadTenantsAndUsers();
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  setFilter(filter: UserRoleFilter): void {
    this.activeFilter.set(filter);
    this.page.set(1);
  }

  selectUser(user: UserCard): void {
    this.selectedUserId.set(user.id);
    this.formMessage.set(null);
  }

  editUser(user: UserCard): void {
    this.selectUser(user);
  }

  deleteUser(user: UserCard): void {
    this.loading.set(true);
    this.formMessage.set(null);

    const tenantQuery = this.isSuperadmin() ? `?tenantId=${encodeURIComponent(user.tenantId)}` : '';

    this.api
      .delete<{ success: boolean; message?: string }>(`/users/${user.id}${tenantQuery}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          if (this.selectedUserId() === user.id) {
            this.selectedUserId.set(null);
          }

          this.loadUsers();
          this.formMessage.set(`Se eliminó a ${user.name}.`);
        },
        error: (error) => {
          this.formMessage.set(error?.error?.message || 'No se pudo eliminar el usuario.');
        },
      });
  }

  refresh(): void {
    this.loadUsers();
  }

  resetForm(): void {
    this.selectedUserId.set(null);
    this.form.reset(
      {
        name: '',
        email: '',
        password: '',
        role: 'admin',
        tenant: '',
      },
      { emitEvent: false }
    );
    this.formMessage.set(null);
  }

  saveUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const selectedUser = this.selectedUser();
    const payload = this.form.getRawValue();
    const resolvedTenant = this.isSuperadmin() ? String(payload.tenant ?? '').trim() : selectedUser?.tenant ?? '';

    if (this.isSuperadmin() && !resolvedTenant) {
      this.form.get('tenant')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const tenantIdFromAuth = this.auth.user()?.tenantId;
    const targetTenantId = this.isSuperadmin() ? resolvedTenant : (tenantIdFromAuth || selectedUser?.tenantId || '');

    if (!targetTenantId) {
      this.formMessage.set('No se pudo determinar el tenant del usuario.');
      return;
    }

    const requestBody: Record<string, unknown> = {
      name: String(payload.name ?? '').trim(),
      email: String(payload.email ?? '').trim(),
      role: (payload.role ?? 'admin') as UserRole,
    };

    const rawPassword = String(payload.password ?? '').trim();
    if (rawPassword) {
      requestBody['password'] = rawPassword;
    }

    if (this.isSuperadmin()) {
      requestBody['tenantId'] = targetTenantId;
    }

    const isEditing = !!selectedUser;
    const endpoint = isEditing
      ? `/users/${selectedUser.id}${this.isSuperadmin() ? `?tenantId=${encodeURIComponent(selectedUser.tenantId)}` : ''}`
      : '/users';

    const request$ = isEditing
      ? this.api.put<{ success: boolean }>(endpoint, requestBody)
      : this.api.post<{ success: boolean }>(endpoint, {
          ...requestBody,
          password: rawPassword || '123456',
        });

    this.loading.set(true);
    this.formMessage.set(null);

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.formMessage.set(isEditing ? 'Usuario actualizado.' : 'Usuario creado.');
        this.resetForm();
        this.loadUsers();
      },
      error: (error) => {
        this.formMessage.set(error?.error?.message || 'No se pudo guardar el usuario.');
      },
    });
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update((current) => current - 1);
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((current) => current + 1);
    }
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
      this.page.set(pageNumber);
    }
  }

  roleLabel(role: UserRole): string {
    switch (role) {
      case 'superadmin':
        return 'Superadmin';
      case 'admin':
        return 'Admin';
      case 'residente':
        return 'Residente';
      case 'familiar':
        return 'Familiar';
      default:
        return 'Usuario';
    }
  }

  initials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const computedInitials = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return computedInitials || name.slice(0, 2).toUpperCase();
  }

  relativeTime(value: Date): string {
    const minutes = Math.max(1, Math.round((Date.now() - value.getTime()) / 60_000));
    if (minutes < 60) {
      return `hace ${minutes} min`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `hace ${hours} h`;
    }

    const days = Math.round(hours / 24);
    return `hace ${days} d`;
  }

  trackByUserId(_: number, user: UserCard): string {
    return user.id;
  }

  startCreate(): void {
    this.selectedUserId.set(null);
    this.form.reset(
      {
        name: '',
        email: '',
        password: '',
        role: 'admin',
        tenant: '',
      },
      { emitEvent: false }
    );
    this.formMessage.set('Vista preparada para crear un usuario nuevo.');
    this.lastSyncedAt.set(new Date());
  }

  private loadTenantsAndUsers(): void {
    if (!this.isSuperadmin()) {
      this.loadUsers();
      return;
    }

    this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants').subscribe({
      next: (response) => {
        this.tenants.set(Array.isArray(response.tenants) ? response.tenants : []);
        this.loadUsers();
      },
      error: () => {
        this.tenants.set([]);
        this.loadUsers();
      },
    });
  }

  private loadUsers(): void {
    this.loading.set(true);

    this.api
      .get<{ success: boolean; users: ApiUser[] }>('/users')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const users = Array.isArray(response.users) ? response.users : [];
          this.users.set(users.map((user, index) => this.toUserCard(user, index)));
          this.lastSyncedAt.set(new Date());
        },
        error: (error) => {
          this.formMessage.set(error?.error?.message || 'No se pudieron cargar los usuarios.');
        },
      });
  }

  private toUserCard(user: ApiUser, index: number): UserCard {
    return {
      id: user._id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant: this.resolveTenantName(user.tenantId),
      status: user.isActive === false ? 'Inactivo' : 'Activo',
      lastActivity: user.createdAt ? new Date(user.createdAt) : new Date(),
      avatarBg: AVATAR_BACKGROUNDS[index % AVATAR_BACKGROUNDS.length],
    };
  }

  private resolveTenantName(tenantId: string): string {
    const tenant = this.tenants().find((current) => current._id === tenantId);
    return tenant?.name ?? tenantId;
  }
}
