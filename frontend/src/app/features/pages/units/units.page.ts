import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Tenant, Unit } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

type UnitType = 'departamento' | 'casa';
type UnitFilter = 'all' | 'departamentos' | 'locales' | 'oficinas' | 'disponible' | 'ocupada';

interface UnitCard {
  id: string;
  tenantId: string;
  code: string;
  type: UnitType;
  description?: string;
  isActive: boolean;
  tenant: string;
  lastActivity: Date;
  avatarBg: string;
}

const FILTERS: Array<{ label: string; value: UnitFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Departamentos', value: 'departamentos' },
  { label: 'Locales', value: 'locales' },
  { label: 'Oficinas', value: 'oficinas' },
  { label: 'Disponible', value: 'disponible' },
  { label: 'Ocupada', value: 'ocupada' },
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
  selector: 'app-units-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './units.page.html',
  styleUrl: './units.page.css',
})
export class UnitsPage {
  readonly filters = FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<UnitFilter>('all');
  readonly selectedUnitId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly loading = signal(false);
  readonly lastSyncedAt = signal(new Date());
  readonly formMessage = signal<string | null>(null);
  readonly units = signal<UnitCard[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly currentRole = computed(() => this.auth.role() ?? 'admin');
  readonly isSuperadmin = computed(() => this.currentRole() === 'superadmin');
  readonly tenantOptions = computed(() => this.tenants().map((tenant) => ({ label: tenant.name, value: tenant._id })));
  readonly form: FormGroup;

  readonly selectedUnit = computed(() => this.units().find((unit) => unit.id === this.selectedUnitId()) ?? null);

  readonly filteredUnits = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const activeFilter = this.activeFilter();

    return this.units().filter((unit) => {
      const searchable = [unit.code, unit.type, unit.description || '', unit.tenant, unit.isActive ? 'disponible' : 'ocupada']
        .join(' ')
        .toLowerCase();

      const matchesQuery = !query || searchable.includes(query);

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'departamentos' && unit.type === 'departamento') ||
        (activeFilter === 'locales' && /local/i.test(`${unit.code} ${unit.description || ''}`)) ||
        (activeFilter === 'oficinas' && /ofi|oficina/i.test(`${unit.code} ${unit.description || ''}`)) ||
        (activeFilter === 'disponible' && unit.isActive) ||
        (activeFilter === 'ocupada' && !unit.isActive);

      return matchesQuery && matchesFilter;
    });
  });

  readonly pagedUnits = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredUnits().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUnits().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  constructor(
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly api: ApiService
  ) {
    this.form = this.fb.group({
      tenantId: [''],
      code: ['', Validators.required],
      type: ['departamento' as UnitType, Validators.required],
      description: [''],
      isActive: [true],
    });

    effect(() => {
      const selected = this.selectedUnit();
      if (!selected) {
        this.form.reset(
          {
            tenantId: '',
            code: '',
            type: 'departamento',
            description: '',
            isActive: true,
          },
          { emitEvent: false }
        );
        return;
      }

      this.form.patchValue(
        {
          tenantId: selected.tenantId,
          code: selected.code,
          type: selected.type,
          description: selected.description || '',
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

    this.loadTenantsAndUnits();
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  setFilter(value: UnitFilter): void {
    this.activeFilter.set(value);
    this.page.set(1);
  }

  selectUnit(unit: UnitCard): void {
    this.selectedUnitId.set(unit.id);
    this.formMessage.set(null);
  }

  startCreate(): void {
    this.selectedUnitId.set(null);
    this.form.reset(
      {
        tenantId: '',
        code: '',
        type: 'departamento',
        description: '',
        isActive: true,
      },
      { emitEvent: false }
    );
    this.formMessage.set('Vista preparada para crear una unidad nueva.');
  }

  resetForm(): void {
    this.startCreate();
    this.formMessage.set(null);
  }

  refresh(): void {
    this.loadUnits();
  }

  saveUnit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const selected = this.selectedUnit();
    const currentUserTenantId = this.auth.user()?.tenantId || '';
    const targetTenantId = this.isSuperadmin() ? String(payload.tenantId || '').trim() : currentUserTenantId;

    if (this.isSuperadmin() && !targetTenantId) {
      this.form.get('tenantId')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const requestBody: Record<string, unknown> = {
      code: String(payload.code || '').trim(),
      type: payload.type,
      description: String(payload.description || '').trim(),
      isActive: !!payload.isActive,
    };

    if (this.isSuperadmin()) {
      requestBody['tenantId'] = targetTenantId;
    }

    const isEditing = !!selected;
    const endpoint = isEditing
      ? `/units/${selected.id}${this.isSuperadmin() ? `?tenantId=${encodeURIComponent(selected.tenantId)}` : ''}`
      : '/units';

    const request$ = isEditing
      ? this.api.put<{ success: boolean }>(endpoint, requestBody)
      : this.api.post<{ success: boolean }>('/units', requestBody);

    this.loading.set(true);
    this.formMessage.set(null);

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.formMessage.set(isEditing ? 'Unidad actualizada.' : 'Unidad creada.');
        this.resetForm();
        this.loadUnits();
      },
      error: (error) => {
        this.formMessage.set(error?.error?.message || 'No se pudo guardar la unidad.');
      },
    });
  }

  deleteUnit(unit: UnitCard): void {
    this.loading.set(true);
    this.formMessage.set(null);

    const tenantQuery = this.isSuperadmin() ? `?tenantId=${encodeURIComponent(unit.tenantId)}` : '';

    this.api
      .delete<{ success: boolean; message?: string }>(`/units/${unit.id}${tenantQuery}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          if (this.selectedUnitId() === unit.id) {
            this.selectedUnitId.set(null);
          }
          this.loadUnits();
          this.formMessage.set(`Se eliminó la unidad ${unit.code}.`);
        },
        error: (error) => {
          this.formMessage.set(error?.error?.message || 'No se pudo eliminar la unidad.');
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

  unitTypeLabel(type: UnitType): string {
    return type === 'departamento' ? 'Departamento' : 'Casa';
  }

  initials(code: string): string {
    return code.trim().slice(0, 2).toUpperCase();
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

  trackByUnitId(_: number, unit: UnitCard): string {
    return unit.id;
  }

  private loadTenantsAndUnits(): void {
    if (!this.isSuperadmin()) {
      this.loadUnits();
      return;
    }

    this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants').subscribe({
      next: (response) => {
        this.tenants.set(Array.isArray(response.tenants) ? response.tenants : []);
        this.loadUnits();
      },
      error: () => {
        this.tenants.set([]);
        this.loadUnits();
      },
    });
  }

  private loadUnits(): void {
    this.loading.set(true);

    this.api
      .get<{ success: boolean; units: Unit[] }>('/units')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const units = Array.isArray(response.units) ? response.units : [];
          this.units.set(units.map((unit, index) => this.toUnitCard(unit, index)));
          this.lastSyncedAt.set(new Date());
        },
        error: (error) => {
          this.formMessage.set(error?.error?.message || 'No se pudieron cargar las unidades.');
        },
      });
  }

  private toUnitCard(unit: Unit, index: number): UnitCard {
    return {
      id: unit._id,
      tenantId: unit.tenantId,
      code: unit.code,
      type: unit.type,
      description: unit.description,
      isActive: unit.isActive !== false,
      tenant: this.resolveTenantName(unit.tenantId),
      lastActivity: new Date(),
      avatarBg: AVATAR_BACKGROUNDS[index % AVATAR_BACKGROUNDS.length],
    };
  }

  private resolveTenantName(tenantId: string): string {
    const tenant = this.tenants().find((current) => current._id === tenantId);
    return tenant?.name || tenantId;
  }
}
