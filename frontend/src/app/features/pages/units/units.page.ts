import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Tenant, Unit } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';
import { MacIconComponent, MacIconName } from '../../shared/mac-icon/mac-icon.component';

type UnitType = 'departamento' | 'casa';
type UnitFilter = 'all' | 'departamento' | 'casa' | 'disponible' | 'ocupada';

interface UnitCard {
  id: string;
  tenantId: string;
  code: string;
  type: UnitType;
  description?: string;
  isActive: boolean;
  tenant: string;
  lastActivity: Date;
}

const FILTERS: Array<{ label: string; value: UnitFilter }> = [
  { label: 'Todas',         value: 'all' },
  { label: 'Departamentos', value: 'departamento' },
  { label: 'Casas',         value: 'casa' },
  { label: 'Disponible',    value: 'disponible' },
  { label: 'Ocupada',       value: 'ocupada' },
];

const UNIT_TYPE_OPTIONS = [
  { label: 'Departamento', value: 'departamento' },
  { label: 'Casa',         value: 'casa' },
];

interface TypeVisual {
  color: string;
  icon: MacIconName;
}
const TYPE_VISUALS: Record<UnitType, TypeVisual> = {
  departamento: { color: 'var(--info-500)', icon: 'building' },
  casa:         { color: 'var(--ok-500)',   icon: 'home' },
};

@Component({
  selector: 'app-units-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FancySelectComponent,
    DrawerComponent,
    ConfirmModalComponent,
    MacIconComponent,
  ],
  templateUrl: './units.page.html',
  styleUrl: './units.page.css',
})
export class UnitsPage {
  readonly filters = FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<UnitFilter>('all');
  readonly view = signal<'grid' | 'list'>('grid');
  readonly page = signal(1);
  readonly pageSize = 9;

  readonly loading = signal(false);
  readonly lastSyncedAt = signal(new Date());

  readonly units = signal<UnitCard[]>([]);
  readonly tenants = signal<Tenant[]>([]);

  // Drawer / modal state
  readonly editorOpen = signal(false);
  readonly editorMode = signal<'create' | 'edit'>('create');
  readonly detail = signal<UnitCard | null>(null);
  readonly toDelete = signal<UnitCard | null>(null);
  readonly editingId = signal<string | null>(null);

  readonly currentRole = computed(() => this.auth.role() ?? 'admin');
  readonly isSuperadmin = computed(() => this.currentRole() === 'superadmin');
  readonly tenantOptions = computed(() => this.tenants().map((t) => ({ label: t.name, value: t._id })));
  readonly unitTypeOptions = UNIT_TYPE_OPTIONS;

  readonly form: FormGroup;
  readonly editingUnit = computed(() => this.units().find((u) => u.id === this.editingId()) ?? null);

  readonly filteredUnits = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();
    return this.units().filter((u) => {
      const searchable = [u.code, u.type, u.description || '', u.tenant, u.isActive ? 'disponible' : 'ocupada']
        .join(' ')
        .toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'departamento' && u.type === 'departamento') ||
        (filter === 'casa' && u.type === 'casa') ||
        (filter === 'disponible' && u.isActive) ||
        (filter === 'ocupada' && !u.isActive);
      return matchesQuery && matchesFilter;
    });
  });

  readonly pagedUnits = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredUnits().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUnits().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  readonly occupiedCount = computed(() => this.units().filter((u) => !u.isActive).length);

  constructor(
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly toast: ToastService
  ) {
    this.form = this.fb.group({
      tenantId: [''],
      code: ['', Validators.required],
      type: ['departamento' as UnitType, Validators.required],
      description: [''],
      isActive: [true],
    });

    effect(() => {
      const selected = this.editingUnit();
      if (!selected) return;
      this.form.patchValue(
        { tenantId: selected.tenantId, code: selected.code, type: selected.type, description: selected.description || '', isActive: selected.isActive },
        { emitEvent: false }
      );
    });

    effect(() => {
      const totalPages = this.totalPages();
      if (this.page() > totalPages) this.page.set(totalPages);
    });

    this.loadTenantsAndUnits();
  }

  // ─── Drawer controls ────────────────────────────────────────────────────
  openCreate(): void {
    this.editingId.set(null);
    this.editorMode.set('create');
    this.form.reset(
      { tenantId: '', code: '', type: 'departamento', description: '', isActive: true },
      { emitEvent: false }
    );
    this.editorOpen.set(true);
  }

  openEdit(unit: UnitCard, event?: Event): void {
    event?.stopPropagation();
    this.detail.set(null);
    this.editingId.set(unit.id);
    this.editorMode.set('edit');
    this.editorOpen.set(true);
  }

  openDetail(unit: UnitCard): void { this.detail.set(unit); }
  closeEditor(): void { this.editorOpen.set(false); this.editingId.set(null); }
  closeDetail(): void { this.detail.set(null); }
  askDelete(unit: UnitCard, event?: Event): void { event?.stopPropagation(); this.toDelete.set(unit); }
  cancelDelete(): void { this.toDelete.set(null); }
  confirmDelete(): void {
    const u = this.toDelete();
    if (!u) return;
    this.toDelete.set(null);
    this.deleteUnit(u);
  }

  // ─── Toolbar ────────────────────────────────────────────────────────────
  setSearch(value: string): void { this.searchTerm.set(value); this.page.set(1); }
  setFilter(value: UnitFilter): void { this.activeFilter.set(value); this.page.set(1); }
  setView(view: 'grid' | 'list'): void { this.view.set(view); }
  setType(type: UnitType): void { this.form.patchValue({ type }); }
  refresh(): void { this.loadUnits(); }

  // ─── Save / Delete ──────────────────────────────────────────────────────
  saveUnit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const editing = this.editingUnit();
    const currentUserTenantId = this.auth.user()?.tenantId || '';
    const targetTenantId = this.isSuperadmin() ? String(payload.tenantId || '').trim() : currentUserTenantId;

    if (this.isSuperadmin() && !targetTenantId) {
      this.form.get('tenantId')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const body: Record<string, unknown> = {
      code: String(payload.code || '').trim(),
      type: payload.type,
      description: String(payload.description || '').trim(),
      isActive: !!payload.isActive,
    };
    if (this.isSuperadmin()) body['tenantId'] = targetTenantId;

    const isEditing = !!editing;
    const endpoint = isEditing
      ? `/units/${editing!.id}${this.isSuperadmin() ? `?tenantId=${encodeURIComponent(editing!.tenantId)}` : ''}`
      : '/units';

    const req$ = isEditing
      ? this.api.put<{ success: boolean }>(endpoint, body)
      : this.api.post<{ success: boolean }>('/units', body);

    this.loading.set(true);
    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok(isEditing ? 'Unidad actualizada' : 'Unidad creada');
        this.closeEditor();
        this.loadUnits();
      },
      error: (err) => this.toast.bad('No se pudo guardar', err?.error?.message),
    });
  }

  private deleteUnit(unit: UnitCard): void {
    this.loading.set(true);
    const tenantQuery = this.isSuperadmin() ? `?tenantId=${encodeURIComponent(unit.tenantId)}` : '';
    this.api
      .delete<{ success: boolean; message?: string }>(`/units/${unit.id}${tenantQuery}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toast.ok('Unidad eliminada', unit.code);
          if (this.editingId() === unit.id) this.closeEditor();
          this.loadUnits();
        },
        error: (err) => this.toast.bad('No se pudo eliminar', err?.error?.message),
      });
  }

  // ─── Pagination ─────────────────────────────────────────────────────────
  previousPage(): void { if (this.page() > 1) this.page.update((c) => c - 1); }
  nextPage(): void     { if (this.page() < this.totalPages()) this.page.update((c) => c + 1); }
  goToPage(n: number): void { if (n >= 1 && n <= this.totalPages()) this.page.set(n); }

  // ─── Formatters ─────────────────────────────────────────────────────────
  unitTypeLabel(type: UnitType): string {
    return type === 'departamento' ? 'Departamento' : 'Casa';
  }
  typeVisual(type: UnitType): TypeVisual { return TYPE_VISUALS[type]; }
  initials(code: string): string { return code.trim().slice(0, 2).toUpperCase(); }
  relativeTime(value: Date): string {
    const minutes = Math.max(1, Math.round((Date.now() - value.getTime()) / 60_000));
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    return `hace ${days} d`;
  }
  trackById(_: number, u: UnitCard): string { return u.id; }

  // ─── Data loading ───────────────────────────────────────────────────────
  private loadTenantsAndUnits(): void {
    if (!this.isSuperadmin()) {
      this.loadUnits();
      return;
    }
    this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants').subscribe({
      next: (r) => { this.tenants.set(Array.isArray(r.tenants) ? r.tenants : []); this.loadUnits(); },
      error: () => { this.tenants.set([]); this.loadUnits(); },
    });
  }

  private loadUnits(): void {
    this.loading.set(true);
    this.api.get<{ success: boolean; units: Unit[] }>('/units')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => {
          const units = Array.isArray(r.units) ? r.units : [];
          this.units.set(units.map((u) => this.toUnitCard(u)));
          this.lastSyncedAt.set(new Date());
        },
        error: (err) => this.toast.bad('No se pudieron cargar unidades', err?.error?.message),
      });
  }

  private toUnitCard(unit: Unit): UnitCard {
    return {
      id: unit._id,
      tenantId: unit.tenantId,
      code: unit.code,
      type: unit.type,
      description: unit.description,
      isActive: unit.isActive !== false,
      tenant: this.resolveTenantName(unit.tenantId),
      lastActivity: new Date(),
    };
  }

  private resolveTenantName(tenantId: string): string {
    return this.tenants().find((t) => t._id === tenantId)?.name || tenantId;
  }
}
