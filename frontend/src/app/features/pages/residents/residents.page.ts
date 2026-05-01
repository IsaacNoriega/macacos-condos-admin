import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Resident as ApiResident, Tenant, Unit, User as ApiUser } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';

type Relationship = 'propietario' | 'familiar' | 'inquilino';
type ResidentFilter = 'all' | 'propietario' | 'familiar' | 'inquilino' | 'activos' | 'inactivos';

interface ResidentRecord extends ApiResident {
  createdAt?: string;
}

interface ResidentCard {
  id: string;
  tenantId: string;
  unitId: string;
  name: string;
  email: string;
  phone?: string;
  relationship: Relationship;
  status: 'Activo' | 'Inactivo';
  isActive: boolean;
  tenant: string;
  unitCode: string;
  linkedRole: 'residente' | 'familiar' | 'desconocido';
  createdAt: Date;
}

const FILTERS: Array<{ label: string; value: ResidentFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Propietario', value: 'propietario' },
  { label: 'Familiar', value: 'familiar' },
  { label: 'Inquilino', value: 'inquilino' },
  { label: 'Activos', value: 'activos' },
  { label: 'Inactivos', value: 'inactivos' },
];

const RELATIONSHIP_OPTIONS = [
  { label: 'Propietario', value: 'propietario' },
  { label: 'Familiar', value: 'familiar' },
  { label: 'Inquilino', value: 'inquilino' },
];

@Component({
  selector: 'app-residents-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FancySelectComponent,
    DrawerComponent,
    ConfirmModalComponent,
    MacIconComponent,
  ],
  templateUrl: './residents.page.html',
  styleUrl: './residents.page.css',
})
export class ResidentsPage {
  readonly filters = FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<ResidentFilter>('all');
  readonly page = signal(1);
  readonly pageSize = 9;
  readonly view = signal<'grid' | 'list'>('grid');

  readonly loading = signal(false);
  readonly lastSyncedAt = signal(new Date());

  readonly residents = signal<ResidentCard[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly users = signal<ApiUser[]>([]);

  // Tracks which tenant the resident list is scoped to (superadmin only).
  // Empty string = superadmin's token tenant (or all, depending on backend).
  readonly viewTenantId = signal<string>('');

  // Mirrors the value of form.controls.tenantId so computed signals can
  // react to tenant changes when a superadmin switches target tenants.
  private readonly formTenantId = signal<string>('');

  // Drawer / modal state
  readonly editorOpen = signal(false);
  readonly editorMode = signal<'create' | 'edit'>('create');
  readonly detail = signal<ResidentCard | null>(null);
  readonly toDelete = signal<ResidentCard | null>(null);
  readonly editingId = signal<string | null>(null);

  readonly currentRole = computed(() => this.auth.role() ?? 'admin');
  readonly isSuperadmin = computed(() => this.currentRole() === 'superadmin');

  readonly tenantOptions = computed(() => this.tenants().map((t) => ({ label: t.name, value: t._id })));

  readonly eligibleUsers = computed(() => {
    const selectedTenantId = this.formTenantId();
    const superadmin = this.isSuperadmin();

    // Emails are only unique per tenant on the backend, so for superadmins
    // we defer showing candidates until a target tenant is chosen and
    // always filter by that tenant to keep the email selection unambiguous.
    if (superadmin && !selectedTenantId) {
      return [];
    }

    return this.users().filter((u) => {
      if (u.role !== 'residente' && u.role !== 'familiar') return false;
      if (superadmin && u.tenantId !== selectedTenantId) return false;
      return true;
    });
  });

  readonly userOptions = computed(() =>
    this.eligibleUsers().map((u) => ({ value: u.email, label: `${u.name} (${u.email})` }))
  );

  readonly relationshipOptions = RELATIONSHIP_OPTIONS;

  readonly unitOptions = computed(() => {
    const selectedTenant = String(this.form.get('tenantId')?.value || '');
    return this.units()
      .filter((unit) => !selectedTenant || unit.tenantId === selectedTenant)
      .map((unit) => ({ value: unit._id, label: unit.code }));
  });

  readonly form: FormGroup;

  readonly editingResident = computed(() =>
    this.residents().find((r) => r.id === this.editingId()) ?? null
  );

  readonly filteredResidents = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const activeFilter = this.activeFilter();

    return this.residents().filter((r) => {
      const searchable = [r.name, r.email, r.phone || '', r.relationship, r.tenant, r.unitCode, r.status, r.linkedRole]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !query || searchable.includes(query);
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'activos' && r.status === 'Activo') ||
        (activeFilter === 'inactivos' && r.status === 'Inactivo') ||
        r.relationship === activeFilter;

      return matchesQuery && matchesFilter;
    });
  });

  readonly pagedResidents = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredResidents().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredResidents().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  readonly activeCount = computed(() => this.residents().filter((r) => r.isActive).length);

  constructor(
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly toast: ToastService
  ) {
    this.form = this.fb.group({
      tenantId: [''],
      unitId: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      phone: [''],
      relationship: ['propietario' as Relationship, Validators.required],
      isActive: [true],
    });

    effect(() => {
      const selected = this.editingResident();
      if (!selected) return;
      this.form.patchValue(
        {
          tenantId: selected.tenantId,
          unitId: selected.unitId,
          email: selected.email,
          name: selected.name,
          phone: selected.phone || '',
          relationship: selected.relationship,
          isActive: selected.isActive,
        },
        { emitEvent: false }
      );
    });

    effect(() => {
      const totalPages = this.totalPages();
      if (this.page() > totalPages) this.page.set(totalPages);
    });

    // Keep formTenantId signal in sync with the form control so that
    // eligibleUsers re-computes when the superadmin switches tenants.
    // Clear the selected user email on tenant changes to avoid picking a
    // candidate from a different tenant.
    const tenantControl = this.form.get('tenantId');
    this.formTenantId.set(String(tenantControl?.value ?? ''));
    tenantControl?.valueChanges.subscribe((value) => {
      const next = String(value ?? '');
      if (next !== this.formTenantId()) {
        this.formTenantId.set(next);
        if (this.isSuperadmin() && this.editorMode() === 'create') {
          this.form.patchValue({ email: '', name: '', unitId: '' }, { emitEvent: false });
        }
      }
    });

    this.loadInitialData();
  }

  // ─── Drawer controls ────────────────────────────────────────────────────
  openCreate(): void {
    this.editingId.set(null);
    this.editorMode.set('create');
    this.form.reset(
      { tenantId: '', unitId: '', email: '', name: '', phone: '', relationship: 'propietario', isActive: true },
      { emitEvent: false }
    );
    this.editorOpen.set(true);
  }

  openEdit(resident: ResidentCard): void {
    this.detail.set(null);
    this.editingId.set(resident.id);
    this.editorMode.set('edit');
    this.editorOpen.set(true);
  }

  openDetail(resident: ResidentCard): void {
    this.detail.set(resident);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
  }

  closeDetail(): void {
    this.detail.set(null);
  }

  askDelete(resident: ResidentCard, event?: Event): void {
    event?.stopPropagation();
    this.toDelete.set(resident);
  }

  cancelDelete(): void {
    this.toDelete.set(null);
  }

  confirmDelete(): void {
    const resident = this.toDelete();
    if (!resident) return;
    this.toDelete.set(null);
    this.deleteResident(resident);
  }

  // ─── Toolbar ────────────────────────────────────────────────────────────
  setSearch(value: string): void { this.searchTerm.set(value); this.page.set(1); }
  setFilter(value: ResidentFilter): void { this.activeFilter.set(value); this.page.set(1); }
  setView(view: 'grid' | 'list'): void { this.view.set(view); }
  onTenantFilterChange(ev: any): void {
    this.viewTenantId.set(ev.target.value);
    this.page.set(1);
    this.loadResidents();
  }

  // ─── User options sync (same behaviour as before) ───────────────────────
  onEmailChange(email: string): void {
    const selectedUser = this.eligibleUsers().find((u) => u.email === email);
    if (!selectedUser) return;
    this.form.patchValue({ name: selectedUser.name }, { emitEvent: false });
    if (selectedUser.role === 'familiar') {
      this.form.patchValue({ relationship: 'familiar' }, { emitEvent: false });
      return;
    }
    const current = this.form.get('relationship')?.value;
    if (current !== 'propietario' && current !== 'inquilino') {
      this.form.patchValue({ relationship: 'propietario' }, { emitEvent: false });
    }
  }

  refresh(): void { this.loadResidents(); }

  // ─── Save / Delete ──────────────────────────────────────────────────────
  saveResident(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const editing = this.editingResident();
    const currentUserTenantId = this.auth.user()?.tenantId || '';
    const targetTenantId = this.isSuperadmin() ? String(payload.tenantId || '').trim() : currentUserTenantId;

    if (this.isSuperadmin() && !targetTenantId) {
      this.form.get('tenantId')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const requestBody: Record<string, unknown> = {
      unitId: String(payload.unitId || '').trim(),
      email: String(payload.email || '').trim(),
      name: String(payload.name || '').trim(),
      phone: String(payload.phone || '').trim(),
      relationship: payload.relationship,
      isActive: !!payload.isActive,
    };
    if (this.isSuperadmin()) requestBody['tenantId'] = targetTenantId;

    const isEditing = !!editing;
    const endpoint = isEditing
      ? `/residents/${editing!.id}${this.isSuperadmin() ? `?tenantId=${encodeURIComponent(editing!.tenantId)}` : ''}`
      : '/residents';

    const request$ = isEditing
      ? this.api.put<{ success: boolean }>(endpoint, requestBody)
      : this.api.post<{ success: boolean }>('/residents', requestBody);

    this.loading.set(true);
    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok(isEditing ? 'Residente actualizado' : 'Residente creado');
        this.closeEditor();
        if (this.isSuperadmin()) {
          this.viewTenantId.set(targetTenantId);
        }
        this.loadResidents();
      },
      error: (err) => this.toast.bad('No se pudo guardar', err?.error?.message),
    });
  }

  toggleActive(resident: ResidentCard, event: Event): void {
    event.stopPropagation();
    const nextActive = !resident.isActive;
    const tenantQuery = this.isSuperadmin() ? `?tenantId=${encodeURIComponent(resident.tenantId)}` : '';
    this.loading.set(true);
    this.api
      .put<{ success: boolean }>(`/residents/${resident.id}${tenantQuery}`, {
        unitId: resident.unitId,
        email: resident.email,
        name: resident.name,
        phone: resident.phone || '',
        relationship: resident.relationship,
        isActive: nextActive,
        ...(this.isSuperadmin() ? { tenantId: resident.tenantId } : {}),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toast.ok(nextActive ? 'Residente activado' : 'Residente desactivado');
          if (this.isSuperadmin()) {
            this.viewTenantId.set(resident.tenantId);
          }
          this.loadResidents();
        },
        error: (err) => this.toast.bad('No se pudo actualizar', err?.error?.message),
      });
  }

  private deleteResident(resident: ResidentCard): void {
    this.loading.set(true);
    const tenantQuery = this.isSuperadmin() ? `?tenantId=${encodeURIComponent(resident.tenantId)}` : '';
    this.api
      .delete<{ success: boolean; message?: string }>(`/residents/${resident.id}${tenantQuery}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toast.ok('Residente eliminado', resident.name);
          if (this.editingId() === resident.id) this.closeEditor();
          if (this.isSuperadmin()) {
            this.viewTenantId.set(resident.tenantId);
          }
          this.loadResidents();
        },
        error: (err) => this.toast.bad('No se pudo eliminar', err?.error?.message),
      });
  }

  // ─── Pagination ─────────────────────────────────────────────────────────
  previousPage(): void { if (this.page() > 1) this.page.update((c) => c - 1); }
  nextPage(): void { if (this.page() < this.totalPages()) this.page.update((c) => c + 1); }
  goToPage(n: number): void { if (n >= 1 && n <= this.totalPages()) this.page.set(n); }

  // ─── Formatters ─────────────────────────────────────────────────────────
  relationshipLabel(r: Relationship): string {
    return { propietario: 'Propietario', familiar: 'Familiar', inquilino: 'Inquilino' }[r] ?? 'Residente';
  }
  linkedRoleLabel(role: ResidentCard['linkedRole']): string {
    return { residente: 'Usuario residente', familiar: 'Usuario familiar', desconocido: 'Sin usuario enlazado' }[role];
  }
  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    return initials || name.slice(0, 2).toUpperCase();
  }
  relativeTime(value: Date): string {
    const minutes = Math.max(1, Math.round((Date.now() - value.getTime()) / 60_000));
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    return `hace ${days} d`;
  }

  trackById(_: number, r: ResidentCard): string { return r.id; }

  // ─── Data loading ───────────────────────────────────────────────────────
  private loadInitialData(): void {
    this.loading.set(true);
    if (!this.isSuperadmin()) {
      this.tenants.set([]);
      this.loadUnitsAndUsersAndResidents();
      return;
    }

    this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants').pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (r) => {
        console.log('[DEBUG] loadInitialData (tenants) response:', r);
        this.tenants.set(Array.isArray(r.tenants) ? r.tenants : []);
        this.loadUnitsAndUsersAndResidents();
      },
      error: () => { this.tenants.set([]); this.loadUnitsAndUsersAndResidents(); },
    });
  }

  private loadUnitsAndUsersAndResidents(): void {
    this.loading.set(true);
    this.api.get<{ success: boolean; units: Unit[] }>('/units')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => { this.units.set(Array.isArray(r.units) ? r.units : []); this.loadUsersAndResidents(); },
        error: () => { this.units.set([]); this.loadUsersAndResidents(); },
      });
  }

  private loadUsersAndResidents(): void {
    this.loading.set(true);
    this.api.get<{ success: boolean; users: ApiUser[] }>('/users')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => { this.users.set(Array.isArray(r.users) ? r.users : []); this.loadResidents(); },
        error: () => { this.users.set([]); this.loadResidents(); },
      });
  }

  private loadResidents(): void {
    this.loading.set(true);
    const tenantQuery =
      this.isSuperadmin() && this.viewTenantId()
        ? `?tenantId=${encodeURIComponent(this.viewTenantId())}`
        : '';
    this.api.get<{ success: boolean; residents: ResidentRecord[] }>(`/residents${tenantQuery}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => {
          console.log('[DEBUG] loadResidents response:', r);
          const residents = Array.isArray(r.residents) ? r.residents : [];
          this.residents.set(residents.map((resident) => this.toResidentCard(resident)));
          this.lastSyncedAt.set(new Date());
        },
        error: (err) => this.toast.bad('No se pudieron cargar residentes', err?.error?.message),
      });
  }

  private toResidentCard(resident: ResidentRecord): ResidentCard {
    const linkedUser = this.users().find((u) => u.email === resident.email);
    const isActive = resident.isActive !== false;
    return {
      id: resident._id,
      tenantId: resident.tenantId,
      unitId: resident.unitId,
      name: resident.name,
      email: resident.email,
      phone: resident.phone,
      relationship: resident.relationship,
      status: isActive ? 'Activo' : 'Inactivo',
      isActive,
      tenant: this.resolveTenantName(resident.tenantId),
      unitCode: this.resolveUnitCode(resident.unitId),
      linkedRole: linkedUser?.role === 'residente' || linkedUser?.role === 'familiar' ? linkedUser.role : 'desconocido',
      createdAt: resident.createdAt ? new Date(resident.createdAt) : new Date(),
    };
  }

  private resolveTenantName(tenantId: string): string {
    return this.tenants().find((t) => t._id === tenantId)?.name || tenantId;
  }
  private resolveUnitCode(unitId: string): string {
    return this.units().find((u) => u._id === unitId)?.code || unitId;
  }
}
