import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Resident as ApiResident, Tenant, Unit, User as ApiUser } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';

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
  tenant: string;
  unitCode: string;
  linkedRole: 'residente' | 'familiar' | 'desconocido';
  createdAt: Date;
  avatarBg: string;
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
  selector: 'app-residents-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FancySelectComponent],
  template: `
    <section class="users-page">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Gestion administrativa</p>
          <h1>Gestion de Residentes - Macacos Condos</h1>
          <p class="hero-note">Crea o edita residentes en el panel izquierdo y revisa la informacion ligada en las cards.</p>
        </div>

        <div class="hero-actions">
          <button class="pill-button secondary" type="button" (click)="refresh()">Refrescar</button>
          <button class="pill-button primary" type="button" (click)="startCreate()">+ Nuevo Residente</button>
        </div>
      </header>

      @if (formMessage()) {
      <p class="status-banner">{{ formMessage() }}</p>
      }

      <div class="content-grid">
        <aside class="editor-panel">
          <div class="panel-head">
            <div>
              <p class="section-label">Crear y editar</p>
              <h2>{{ selectedResident() ? 'Editar residente seleccionado' : 'Nuevo residente' }}</h2>
            </div>
            <span class="mode-chip">{{ isSuperadmin() ? 'Superadmin' : currentRole() }}</span>
          </div>

          <form class="editor-form" [formGroup]="form" (ngSubmit)="saveResident()">
            @if (isSuperadmin()) {
            <label>
              <span>Tenant</span>
              <app-fancy-select formControlName="tenantId" [placeholder]="'Selecciona un tenant'" [options]="tenantOptions()" />
            </label>
            }

            <label>
              <span>Unidad</span>
              <app-fancy-select formControlName="unitId" [placeholder]="'Selecciona una unidad'" [options]="unitOptions()" />
            </label>

            <label>
              <span>Usuario residente/familiar</span>
              <app-fancy-select
                formControlName="email"
                [placeholder]="'Selecciona un usuario'"
                [options]="userOptions()"
                (selectionChange)="onEmailChange($event)" />
            </label>

            <label>
              <span>Nombre</span>
              <input type="text" formControlName="name" placeholder="Nombre" />
            </label>

            <label>
              <span>Telefono</span>
              <input type="text" formControlName="phone" placeholder="Telefono" />
            </label>

            <label>
              <span>Relacion</span>
              <app-fancy-select formControlName="relationship" [options]="relationshipOptions" />
            </label>

            <label class="checkbox-row">
              <input type="checkbox" formControlName="isActive" />
              <span>Activo</span>
            </label>

            <div class="form-actions">
              <button class="pill-button primary" type="submit" [disabled]="loading()">Guardar</button>
              <button class="pill-button secondary" type="button" (click)="resetForm()">Limpiar</button>
            </div>
          </form>
        </aside>

        <section class="results-column">
          <section class="board-tools">
            <label class="search-input">
              <span aria-hidden="true">⌕</span>
              <input [value]="searchTerm()" (input)="setSearch($any($event.target).value)" type="search" placeholder="Buscar residentes..." />
            </label>

            <nav class="filter-bar" aria-label="Filtros de residentes">
              @for (filter of filters; track filter.value) {
              <button class="filter-chip" type="button" [class.active]="activeFilter() === filter.value" (click)="setFilter(filter.value)">
                {{ filter.label }}
              </button>
              }
            </nav>
          </section>

          <section class="board">
            <div class="board-head">
              <div>
                <p class="section-label">Residentes</p>
                <h2>{{ filteredResidents().length }} resultados</h2>
              </div>
              <p class="board-meta">Mostrando {{ pagedResidents().length }} de {{ filteredResidents().length }}</p>
            </div>

            <div class="users-grid">
              @for (resident of pagedResidents(); track trackByResidentId($index, resident)) {
              <article class="user-card resident-card" [class.selected]="selectedResident()?.id === resident.id" (click)="selectResident(resident)">
                <div class="card-top">
                  <div class="avatar" [style.background]="resident.avatarBg">{{ initials(resident.name) }}</div>

                  <div class="card-copy">
                    <h3>{{ resident.name }}</h3>
                    <p>{{ resident.email }}</p>
                  </div>

                  <div class="card-actions">
                    <button type="button" class="icon-button" (click)="selectResident(resident); $event.stopPropagation()" aria-label="Editar residente">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="14" height="14">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                      </svg>
                    </button>
                    <button type="button" class="icon-button danger" (click)="deleteResident(resident); $event.stopPropagation()" aria-label="Eliminar residente">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="14" height="14">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="card-meta">
                  <span class="role-pill">{{ relationshipLabel(resident.relationship) }}</span>
                  <span class="tenant-label">{{ resident.tenant }} - {{ resident.unitCode }}</span>
                </div>

                <div class="card-foot">
                  <small>{{ linkedRoleLabel(resident.linkedRole) }}</small>
                  <small>{{ resident.phone || 'Sin telefono' }}</small>
                  <strong>{{ resident.status }} - {{ relativeTime(resident.createdAt) }}</strong>
                </div>
              </article>
              }
            </div>

            <footer class="pagination">
              <button class="page-button" type="button" (click)="previousPage()" [disabled]="page() === 1">«</button>

              @for (pageNumber of pageNumbers(); track pageNumber) {
              <button class="page-button page-number" type="button" [class.active]="page() === pageNumber" (click)="goToPage(pageNumber)">
                {{ pageNumber }}
              </button>
              }

              <button class="page-button" type="button" (click)="nextPage()" [disabled]="page() === totalPages()">»</button>
            </footer>
          </section>
        </section>
      </div>
    </section>
  `,
  styles: [
    `
      @import '../users/users.page.css';

      .resident-card {
        padding: 1rem;
        gap: 0.62rem;
        height: auto;
        align-self: start;
      }

      .results-column .users-grid {
        align-content: start;
        align-items: start;
        grid-auto-rows: min-content;
      }

      .resident-card .card-top {
        grid-template-columns: 2.45rem minmax(0, 1fr) auto;
        gap: 0.68rem;
      }

      .resident-card .avatar {
        width: 2.45rem;
        height: 2.45rem;
        font-size: 0.84rem;
      }

      .resident-card .card-copy h3 {
        font-size: 1rem;
      }

      .resident-card .card-copy p {
        font-size: 0.8rem;
      }

      .resident-card .card-meta {
        gap: 0.4rem;
      }

      .resident-card .card-foot {
        gap: 0.4rem;
      }

      .resident-card .card-foot small,
      .resident-card .card-foot strong {
        font-size: 0.8rem;
      }
    `,
  ],
})
export class ResidentsPage {
  readonly filters = FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<ResidentFilter>('all');
  readonly selectedResidentId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly loading = signal(false);
  readonly lastSyncedAt = signal(new Date());
  readonly formMessage = signal<string | null>(null);

  readonly residents = signal<ResidentCard[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly users = signal<ApiUser[]>([]);

  readonly currentRole = computed(() => this.auth.role() ?? 'admin');
  readonly isSuperadmin = computed(() => this.currentRole() === 'superadmin');
  readonly tenantOptions = computed(() => this.tenants().map((tenant) => ({ label: tenant.name, value: tenant._id })));

  readonly eligibleUsers = computed(() => this.users().filter((user) => user.role === 'residente' || user.role === 'familiar'));

  readonly userOptions = computed(() =>
    this.eligibleUsers().map((user) => ({
      value: user.email,
      label: `${user.name} (${user.email})`,
    }))
  );
  readonly relationshipOptions = RELATIONSHIP_OPTIONS;

  readonly unitOptions = computed(() => {
    const selectedTenant = String(this.form.get('tenantId')?.value || '');
    return this.units()
      .filter((unit) => !selectedTenant || unit.tenantId === selectedTenant)
      .map((unit) => ({ value: unit._id, label: unit.code }));
  });

  readonly form: FormGroup;
  readonly selectedResident = computed(() => this.residents().find((resident) => resident.id === this.selectedResidentId()) ?? null);

  readonly filteredResidents = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const activeFilter = this.activeFilter();

    return this.residents().filter((resident) => {
      const searchable = [
        resident.name,
        resident.email,
        resident.phone || '',
        resident.relationship,
        resident.tenant,
        resident.unitCode,
        resident.status,
        resident.linkedRole,
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !query || searchable.includes(query);
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'activos' && resident.status === 'Activo') ||
        (activeFilter === 'inactivos' && resident.status === 'Inactivo') ||
        resident.relationship === activeFilter;

      return matchesQuery && matchesFilter;
    });
  });

  readonly pagedResidents = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredResidents().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredResidents().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  constructor(
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly api: ApiService
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
      const selected = this.selectedResident();
      if (!selected) {
        this.form.reset(
          {
            tenantId: '',
            unitId: '',
            email: '',
            name: '',
            phone: '',
            relationship: 'propietario',
            isActive: true,
          },
          { emitEvent: false }
        );
        return;
      }

      this.form.patchValue(
        {
          tenantId: selected.tenantId,
          unitId: selected.unitId,
          email: selected.email,
          name: selected.name,
          phone: selected.phone || '',
          relationship: selected.relationship,
          isActive: selected.status === 'Activo',
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

    this.loadInitialData();
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  setFilter(value: ResidentFilter): void {
    this.activeFilter.set(value);
    this.page.set(1);
  }

  selectResident(resident: ResidentCard): void {
    this.selectedResidentId.set(resident.id);
    this.formMessage.set(null);
  }

  onEmailChange(email: string): void {
    const selectedUser = this.eligibleUsers().find((user) => user.email === email);
    if (!selectedUser) {
      return;
    }

    this.form.patchValue({ name: selectedUser.name }, { emitEvent: false });

    if (selectedUser.role === 'familiar') {
      this.form.patchValue({ relationship: 'familiar' }, { emitEvent: false });
      return;
    }

    const currentRelationship = this.form.get('relationship')?.value;
    if (currentRelationship !== 'propietario' && currentRelationship !== 'inquilino') {
      this.form.patchValue({ relationship: 'propietario' }, { emitEvent: false });
    }
  }

  startCreate(): void {
    this.selectedResidentId.set(null);
    this.form.reset(
      {
        tenantId: '',
        unitId: '',
        email: '',
        name: '',
        phone: '',
        relationship: 'propietario',
        isActive: true,
      },
      { emitEvent: false }
    );
    this.formMessage.set('Vista preparada para crear un residente nuevo.');
  }

  resetForm(): void {
    this.startCreate();
    this.formMessage.set(null);
  }

  refresh(): void {
    this.loadResidents();
  }

  saveResident(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const selected = this.selectedResident();
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

    if (this.isSuperadmin()) {
      requestBody['tenantId'] = targetTenantId;
    }

    const isEditing = !!selected;
    const endpoint = isEditing
      ? `/residents/${selected.id}${this.isSuperadmin() ? `?tenantId=${encodeURIComponent(selected.tenantId)}` : ''}`
      : '/residents';

    const request$ = isEditing
      ? this.api.put<{ success: boolean }>(endpoint, requestBody)
      : this.api.post<{ success: boolean }>('/residents', requestBody);

    this.loading.set(true);
    this.formMessage.set(null);

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.formMessage.set(isEditing ? 'Residente actualizado.' : 'Residente creado.');
        this.resetForm();
        this.loadResidents();
      },
      error: (error) => {
        this.formMessage.set(error?.error?.message || 'No se pudo guardar el residente.');
      },
    });
  }

  deleteResident(resident: ResidentCard): void {
    this.loading.set(true);
    this.formMessage.set(null);

    const tenantQuery = this.isSuperadmin() ? `?tenantId=${encodeURIComponent(resident.tenantId)}` : '';

    this.api
      .delete<{ success: boolean; message?: string }>(`/residents/${resident.id}${tenantQuery}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          if (this.selectedResidentId() === resident.id) {
            this.selectedResidentId.set(null);
          }
          this.loadResidents();
          this.formMessage.set(`Se eliminó a ${resident.name}.`);
        },
        error: (error) => {
          this.formMessage.set(error?.error?.message || 'No se pudo eliminar el residente.');
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

  relationshipLabel(relationship: Relationship): string {
    switch (relationship) {
      case 'propietario':
        return 'Propietario';
      case 'familiar':
        return 'Familiar';
      case 'inquilino':
        return 'Inquilino';
      default:
        return 'Residente';
    }
  }

  linkedRoleLabel(role: ResidentCard['linkedRole']): string {
    switch (role) {
      case 'residente':
        return 'Usuario residente';
      case 'familiar':
        return 'Usuario familiar';
      default:
        return 'Sin usuario enlazado';
    }
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    return initials || name.slice(0, 2).toUpperCase();
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

  trackByResidentId(_: number, resident: ResidentCard): string {
    return resident.id;
  }

  private loadInitialData(): void {
    this.loading.set(true);

    const tenantsRequest = this.isSuperadmin()
      ? this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants')
      : this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants?limit=0');

    tenantsRequest
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.tenants.set(Array.isArray(response.tenants) ? response.tenants : []);
          this.loadUnitsAndUsersAndResidents();
        },
        error: () => {
          this.tenants.set([]);
          this.loadUnitsAndUsersAndResidents();
        },
      });
  }

  private loadUnitsAndUsersAndResidents(): void {
    this.loading.set(true);

    this.api
      .get<{ success: boolean; units: Unit[] }>('/units')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (unitResponse) => {
          this.units.set(Array.isArray(unitResponse.units) ? unitResponse.units : []);
          this.loadUsersAndResidents();
        },
        error: () => {
          this.units.set([]);
          this.loadUsersAndResidents();
        },
      });
  }

  private loadUsersAndResidents(): void {
    this.loading.set(true);

    this.api
      .get<{ success: boolean; users: ApiUser[] }>('/users')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (userResponse) => {
          this.users.set(Array.isArray(userResponse.users) ? userResponse.users : []);
          this.loadResidents();
        },
        error: () => {
          this.users.set([]);
          this.loadResidents();
        },
      });
  }

  private loadResidents(): void {
    this.loading.set(true);

    this.api
      .get<{ success: boolean; residents: ResidentRecord[] }>('/residents')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const residents = Array.isArray(response.residents) ? response.residents : [];
          this.residents.set(residents.map((resident, index) => this.toResidentCard(resident, index)));
          this.lastSyncedAt.set(new Date());
        },
        error: (error) => {
          this.formMessage.set(error?.error?.message || 'No se pudieron cargar los residentes.');
        },
      });
  }

  private toResidentCard(resident: ResidentRecord, index: number): ResidentCard {
    const linkedUser = this.users().find((user) => user.email === resident.email);
    return {
      id: resident._id,
      tenantId: resident.tenantId,
      unitId: resident.unitId,
      name: resident.name,
      email: resident.email,
      phone: resident.phone,
      relationship: resident.relationship,
      status: resident.isActive === false ? 'Inactivo' : 'Activo',
      tenant: this.resolveTenantName(resident.tenantId),
      unitCode: this.resolveUnitCode(resident.unitId),
      linkedRole: linkedUser?.role === 'residente' || linkedUser?.role === 'familiar' ? linkedUser.role : 'desconocido',
      createdAt: resident.createdAt ? new Date(resident.createdAt) : new Date(),
      avatarBg: AVATAR_BACKGROUNDS[index % AVATAR_BACKGROUNDS.length],
    };
  }

  private resolveTenantName(tenantId: string): string {
    const tenant = this.tenants().find((current) => current._id === tenantId);
    return tenant?.name || tenantId;
  }

  private resolveUnitCode(unitId: string): string {
    const unit = this.units().find((current) => current._id === unitId);
    return unit?.code || unitId;
  }
}
