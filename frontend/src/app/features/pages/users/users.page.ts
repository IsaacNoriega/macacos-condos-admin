import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { User as ApiUser, Tenant, UserRole } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

type UserRoleFilter = 'all' | 'admin' | 'residente' | 'familiar' | 'superadmin';

interface UserCardView {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  tenantName: string;
  isActive: boolean;
  createdAt: Date;
  initials: string;
}

const ROLE_FILTERS: Array<{ label: string; value: UserRoleFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Administradores', value: 'admin' },
  { label: 'Residentes', value: 'residente' },
  { label: 'Familiares', value: 'familiar' },
  { label: 'Superadmins', value: 'superadmin' },
];

const ROLE_OPTIONS = [
  { label: 'Superadmin', value: 'superadmin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Residente', value: 'residente' },
  { label: 'Familiar', value: 'familiar' },
];

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FancySelectComponent,
    MacIconComponent,
    DrawerComponent,
    ConfirmModalComponent
  ],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css',
})
export class UsersPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly roleFilters = ROLE_FILTERS;
  readonly roleOptions = ROLE_OPTIONS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<UserRoleFilter>('all');
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly view = signal<'grid' | 'list'>('grid');
  readonly loading = signal(false);
  readonly users = signal<UserCardView[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly toDelete = signal<UserCardView | null>(null);
  readonly editorOpen = signal(false);
  readonly selectedUserId = signal<string | null>(null);
  readonly detailUser = signal<UserCardView | null>(null);
  readonly viewTenantId = signal<string>('');

  readonly isSuperadmin = computed(() => this.auth.role() === 'superadmin');
  readonly tenantOptions = computed(() => this.tenants().map(t => ({ label: t.name, value: t._id })));
  
  readonly form: FormGroup;
  readonly selectedUser = computed(() => this.users().find(u => u.id === this.selectedUserId()) || null);

  readonly filteredUsers = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.users().filter(u => {
      const searchable = [u.name, u.email, u.tenantName, u.role].join(' ').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesFilter = filter === 'all' || u.role === filter;
      return matchesQuery && matchesFilter;
    });
  });

  readonly pagedUsers = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      role: ['admin' as UserRole, Validators.required],
      tenantId: [''],
      isActive: [true],
    });

    effect(() => {
      const selected = this.selectedUser();
      if (!selected) {
        this.form.reset({
          name: '',
          email: '',
          password: '',
          role: 'admin',
          tenantId: '',
          isActive: true,
        }, { emitEvent: false });
        return;
      }

      this.form.patchValue({
        name: selected.name,
        email: selected.email,
        password: '',
        role: selected.role,
        tenantId: selected.tenantId,
        isActive: selected.isActive,
      }, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  setSearch(val: string): void { this.searchTerm.set(val); this.page.set(1); }
  setFilter(val: UserRoleFilter): void { this.activeFilter.set(val); this.page.set(1); }
  setView(view: 'grid' | 'list'): void { this.view.set(view); }

  openCreate(): void {
    this.selectedUserId.set(null);
    this.editorOpen.set(true);
  }

  openEdit(user: UserCardView, ev?: Event): void {
    if (ev) ev.stopPropagation();
    this.selectedUserId.set(user.id);
    this.editorOpen.set(true);
    this.detailUser.set(null);
  }

  openDetail(user: UserCardView): void {
    this.detailUser.set(user);
  }

  closeDetail(): void {
    this.detailUser.set(null);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  saveUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    const isEditing = !!this.selectedUserId();
    
    if (!isEditing && !val.password) {
      this.toast.bad('La contraseña es obligatoria al crear un usuario');
      return;
    }

    if (this.isSuperadmin() && !val.tenantId) {
      this.toast.bad('Debes seleccionar un condominio');
      return;
    }

    const payload: any = {
      name: val.name.trim(),
      email: val.email.trim(),
      role: val.role,
      isActive: val.isActive
    };

    if (val.password) payload.password = val.password.trim();
    if (this.isSuperadmin()) payload.tenantId = val.tenantId;

    const endpoint = isEditing ? `/users/${this.selectedUserId()}` : '/users';
    const query = isEditing && this.isSuperadmin() ? `?tenantId=${this.selectedUser()?.tenantId}` : '';
    
    this.loading.set(true);
    const req$ = isEditing ? this.api.put(endpoint + query, payload) : this.api.post(endpoint, payload);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok(isEditing ? 'Usuario actualizado' : 'Usuario creado');
        this.closeEditor();
        this.loadUsers();
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al guardar usuario')
    });
  }

  toggleActive(user: UserCardView, ev: Event): void {
    ev.stopPropagation();
    const newState = !user.isActive;
    
    this.api.put(`/users/${user.id}${this.isSuperadmin() ? `?tenantId=${user.tenantId}` : ''}`, { isActive: newState }).subscribe({
      next: () => {
        this.toast.ok(newState ? 'Usuario activado' : 'Usuario desactivado');
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, isActive: newState } : u));
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al cambiar estado')
    });
  }

  askDelete(user: UserCardView, ev: Event): void {
    ev.stopPropagation();
    this.toDelete.set(user);
  }

  confirmDelete(): void {
    const user = this.toDelete();
    if (!user) return;

    const query = this.isSuperadmin() ? `?tenantId=${user.tenantId}` : '';
    this.loading.set(true);
    this.api.delete(`/users/${user.id}${query}`).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok('Usuario eliminado');
        this.toDelete.set(null);
        this.loadUsers();
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al eliminar')
    });
  }

  onTenantFilterChange(ev: any): void {
    this.viewTenantId.set(ev.target.value);
    this.page.set(1);
    this.loadUsers();
  }

  private loadInitialData(): void {
    if (this.isSuperadmin()) {
      this.api.get<{ tenants: Tenant[] }>('/tenants').subscribe(res => this.tenants.set(res.tenants || []));
    }
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading.set(true);
    let url = '/users';
    if (this.isSuperadmin() && this.viewTenantId()) {
      url += `?tenantId=${encodeURIComponent(this.viewTenantId())}`;
    }

    this.api.get<{ users: ApiUser[] }>(url)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          const raw = res.users || [];
          this.users.set(raw.map(u => ({
            id: u._id,
            tenantId: u.tenantId,
            name: u.name,
            email: u.email,
            role: u.role,
            tenantName: this.resolveTenantName(u.tenantId),
            isActive: u.isActive !== false,
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
            initials: this.getInitials(u.name)
          })));
        },
        error: (err) => this.toast.bad(err?.error?.message || 'Error al cargar usuarios')
      });
  }

  private resolveTenantName(id: string): string {
    const t = this.tenants().find(t => t._id === id);
    return t ? t.name : 'Condominio';
  }

  private getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'superadmin': return 'danger';
      case 'admin': return 'primary';
      case 'residente': return 'ok';
      case 'familiar': return 'info';
      default: return 'warn';
    }
  }

  relativeTime(date: Date): string {
    const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.round(hours / 24)}d`;
  }

  previousPage(): void {
    if (this.page() > 1) this.page.update(p => p - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) this.page.update(p => p + 1);
  }

  goToPage(n: number): void {
    this.page.set(n);
  }
}
