import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Tenant } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';

type AmenityFilter = 'all' | 'activas' | 'inactivas';

interface Amenity {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  maxDailyHours: number;
}

interface AmenityCard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  tenant: string;
  createdAt: Date;
  avatarBg: string;
  maxDailyHours: number;
}

const FILTERS: Array<{ label: string; value: AmenityFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Activas', value: 'activas' },
  { label: 'Inactivas', value: 'inactivas' },
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
  selector: 'app-amenities-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FancySelectComponent],
  template: `
    <section class="users-page">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Gestion administrativa</p>
          <h1>Gestion de Amenidades - Macacos Condos</h1>
          <p class="hero-note">Crea o edita amenidades en el panel izquierdo y revisa el listado detallado a la derecha.</p>
        </div>

        <div class="hero-actions">
          <button class="pill-button secondary" type="button" (click)="refresh()">Refrescar</button>
          <button class="pill-button primary" type="button" (click)="startCreate()">+ Nueva Amenidad</button>
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
              <h2>{{ selectedAmenity() ? 'Editar amenidad' : 'Nueva amenidad' }}</h2>
            </div>
            <span class="mode-chip">{{ isSuperadmin() ? 'Superadmin' : currentRole() }}</span>
          </div>

          <form class="editor-form" [formGroup]="form" (ngSubmit)="saveAmenity()">
            @if (isSuperadmin()) {
            <label>
              <span>Tenant</span>
              <app-fancy-select formControlName="tenantId" [placeholder]="'Selecciona un tenant'" [options]="tenantOptions()" />
            </label>
            }

            <label>
              <span>Nombre</span>
              <input type="text" formControlName="name" placeholder="Nombre" />
            </label>

            <label>
              <span>Descripcion</span>
              <textarea formControlName="description" rows="3" placeholder="Descripcion"></textarea>
            </label>

            <label>
              <span>Horas disponibles para reservar</span>
              <input type="number" formControlName="maxDailyHours" min="1" placeholder="Ej: 4" required />
            </label>

            <label class="checkbox-row">
              <input type="checkbox" formControlName="isActive" />
              <span>Activa</span>
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
              <input [value]="searchTerm()" (input)="setSearch($any($event.target).value)" type="search" placeholder="Buscar amenidades..." />
            </label>

            <nav class="filter-bar" aria-label="Filtros de amenidades">
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
                <p class="section-label">Amenidades</p>
                <h2>{{ filteredAmenities().length }} resultados</h2>
              </div>
              <p class="board-meta">Mostrando {{ pagedAmenities().length }} de {{ filteredAmenities().length }}</p>
            </div>

            <div class="users-grid">
              @for (amenity of pagedAmenities(); track trackByAmenityId($index, amenity)) {
              <article class="user-card" [class.selected]="selectedAmenity()?.id === amenity.id" (click)="selectAmenity(amenity)">
                <div class="card-top">
                  <div class="avatar" [style.background]="amenity.avatarBg">{{ initials(amenity.name) }}</div>

                  <div class="card-copy">
                    <h3>{{ amenity.name }}</h3>
                    <p>{{ amenity.description || 'Sin descripcion' }}</p>
                  </div>

                  <div><strong>Horas disponibles:</strong> {{ amenity.maxDailyHours }}</div>

                  <div class="card-actions">
                    <button type="button" class="icon-button" (click)="selectAmenity(amenity); $event.stopPropagation()" aria-label="Editar amenidad">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="14" height="14">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                      </svg>
                    </button>
                    <button type="button" class="icon-button danger" (click)="deleteAmenity(amenity); $event.stopPropagation()" aria-label="Eliminar amenidad">
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
                  <span class="role-pill">{{ amenity.isActive ? 'Activa' : 'Inactiva' }}</span>
                  <span class="tenant-label">{{ amenity.tenant }}</span>
                </div>

                <div class="card-foot">
                  <small>Creada</small>
                  <strong>{{ relativeTime(amenity.createdAt) }}</strong>
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
  styles: [`@import '../units/units.page.css';`],
})
export class AmenitiesPage {
  readonly filters = FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<AmenityFilter>('all');
  readonly selectedAmenityId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly loading = signal(false);
  readonly lastSyncedAt = signal(new Date());
  readonly formMessage = signal<string | null>(null);
  readonly amenities = signal<AmenityCard[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly currentRole = computed(() => this.auth.role() ?? 'admin');
  readonly isSuperadmin = computed(() => this.currentRole() === 'superadmin');
  readonly tenantOptions = computed(() => this.tenants().map((tenant) => ({ label: tenant.name, value: tenant._id })));
  readonly form: FormGroup;

  readonly selectedAmenity = computed(() => this.amenities().find((amenity) => amenity.id === this.selectedAmenityId()) ?? null);

  readonly filteredAmenities = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const activeFilter = this.activeFilter();

    return this.amenities().filter((amenity) => {
      const searchable = [amenity.name, amenity.description || '', amenity.tenant, amenity.isActive ? 'activa' : 'inactiva']
        .join(' ')
        .toLowerCase();

      const matchesQuery = !query || searchable.includes(query);

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'activas' && amenity.isActive) ||
        (activeFilter === 'inactivas' && !amenity.isActive);

      return matchesQuery && matchesFilter;
    });
  });

  readonly pagedAmenities = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredAmenities().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAmenities().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  constructor(
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly api: ApiService
  ) {
    this.form = this.fb.group({
      tenantId: [''],
      name: ['', Validators.required],
      description: [''],
      maxDailyHours: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
    });

    effect(() => {
      const selected = this.selectedAmenity();
      if (!selected) {
        this.form.reset(
          {
            tenantId: '',
            name: '',
            description: '',
            maxDailyHours: 1,
            isActive: true,
          },
          { emitEvent: false }
        );
        return;
      }

      this.form.patchValue(
        {
          tenantId: selected.tenantId,
          name: selected.name,
          description: selected.description || '',
          maxDailyHours: selected.maxDailyHours,
          isActive: selected.isActive,
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

    this.loadTenantsAndAmenities();
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  setFilter(value: AmenityFilter): void {
    this.activeFilter.set(value);
    this.page.set(1);
  }

  selectAmenity(amenity: AmenityCard): void {
    this.selectedAmenityId.set(amenity.id);
    this.formMessage.set(null);
  }

  startCreate(): void {
    this.selectedAmenityId.set(null);
    this.form.reset(
      {
        tenantId: '',
        name: '',
        description: '',
        isActive: true,
      },
      { emitEvent: false }
    );
    this.formMessage.set('Vista preparada para crear una amenidad nueva.');
  }

  resetForm(): void {
    this.startCreate();
    this.formMessage.set(null);
  }

  refresh(): void {
    this.loadAmenities();
  }

  saveAmenity(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const selected = this.selectedAmenity();
    const currentUserTenantId = this.auth.user()?.tenantId || '';
    const targetTenantId = this.isSuperadmin() ? String(payload.tenantId || '').trim() : currentUserTenantId;

    if (this.isSuperadmin() && !targetTenantId) {
      this.form.get('tenantId')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const requestBody: Record<string, unknown> = {
      name: String(payload.name || '').trim(),
      description: String(payload.description || '').trim(),
      maxDailyHours: Number(payload.maxDailyHours) || 1,
      isActive: !!payload.isActive,
    };

    if (this.isSuperadmin()) {
      requestBody['tenantId'] = targetTenantId;
    }

    const isEditing = !!selected;
    const endpoint = isEditing
      ? `/amenities/${selected.id}${this.isSuperadmin() ? `?tenantId=${encodeURIComponent(selected.tenantId)}` : ''}`
      : '/amenities';

    const request$ = isEditing
      ? this.api.put<{ success: boolean }>(endpoint, requestBody)
      : this.api.post<{ success: boolean }>('/amenities', requestBody);

    this.loading.set(true);
    this.formMessage.set(null);

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.formMessage.set(isEditing ? 'Amenidad actualizada.' : 'Amenidad creada.');
        this.resetForm();
        this.loadAmenities();
      },
      error: (error) => {
        this.formMessage.set(error?.error?.message || 'No se pudo guardar la amenidad.');
      },
    });
  }

  deleteAmenity(amenity: AmenityCard): void {
    this.loading.set(true);
    this.formMessage.set(null);

    const tenantQuery = this.isSuperadmin() ? `?tenantId=${encodeURIComponent(amenity.tenantId)}` : '';

    this.api
      .delete<{ success: boolean; message?: string }>(`/amenities/${amenity.id}${tenantQuery}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          if (this.selectedAmenityId() === amenity.id) {
            this.selectedAmenityId.set(null);
          }
          this.loadAmenities();
          this.formMessage.set(`Se eliminó la amenidad ${amenity.name}.`);
        },
        error: (error) => {
          this.formMessage.set(error?.error?.message || 'No se pudo eliminar la amenidad.');
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

  initials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'AM';
    }

    return trimmed
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
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

  trackByAmenityId(_: number, amenity: AmenityCard): string {
    return amenity.id;
  }

  private loadTenantsAndAmenities(): void {
    if (!this.isSuperadmin()) {
      this.loadAmenities();
      return;
    }

    this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants').subscribe({
      next: (response) => {
        this.tenants.set(Array.isArray(response.tenants) ? response.tenants : []);
        this.loadAmenities();
      },
      error: () => {
        this.tenants.set([]);
        this.loadAmenities();
      },
    });
  }

  private loadAmenities(): void {
    this.loading.set(true);

    this.api
      .get<{ success: boolean; amenities: Amenity[] }>('/amenities')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const amenities = Array.isArray(response.amenities) ? response.amenities : [];
          this.amenities.set(amenities.map((amenity, index) => this.toAmenityCard(amenity, index)));
          this.lastSyncedAt.set(new Date());
        },
        error: (error) => {
          this.formMessage.set(error?.error?.message || 'No se pudieron cargar las amenidades.');
        },
      });
  }

  private toAmenityCard(amenity: Amenity, index: number): AmenityCard {
    return {
      id: amenity._id,
      tenantId: amenity.tenantId,
      name: amenity.name,
      description: amenity.description,
      isActive: amenity.isActive !== false,
      tenant: this.resolveTenantName(amenity.tenantId),
      createdAt: amenity.createdAt ? new Date(amenity.createdAt) : new Date(),
      avatarBg: AVATAR_BACKGROUNDS[index % AVATAR_BACKGROUNDS.length],
      maxDailyHours: amenity.maxDailyHours,
    };
  }

  private resolveTenantName(tenantId: string): string {
    const tenant = this.tenants().find((current) => current._id === tenantId);
    return tenant?.name || tenantId;
  }
}
