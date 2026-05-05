import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Tenant } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

type AmenityFilter = 'all' | 'activas' | 'inactivas';

interface Amenity {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  maxDurationHours?: number;
  isActive?: boolean;
  createdAt?: string;
}

interface AmenityCard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  maxDurationHours: number;
  isActive: boolean;
  tenant: string;
  createdAt: Date;
  avatarBg: string;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FancySelectComponent,
    MacIconComponent,
    DrawerComponent,
    ConfirmModalComponent
  ],
  templateUrl: './amenities.page.html',
  styleUrl: './amenities.page.css',
})
export class AmenitiesPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly filters = FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<AmenityFilter>('all');
  readonly selectedAmenityId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly view = signal<'grid' | 'list'>('grid');
  readonly loading = signal(false);
  readonly amenities = signal<AmenityCard[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly toDelete = signal<AmenityCard | null>(null);
  readonly editorOpen = signal(false);
  readonly viewTenantId = signal<string>('');
  
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

  constructor() {
    this.form = this.fb.group({
      tenantId: [''],
      name: ['', Validators.required],
      description: [''],
      maxDurationHours: [1, [Validators.required, Validators.min(0.5)]],
      isActive: [true],
    });

    effect(() => {
      const selected = this.selectedAmenity();
      if (!selected) {
        this.form.reset({
          tenantId: '',
          name: '',
          description: '',
          maxDurationHours: 1,
          isActive: true,
        }, { emitEvent: false });
        return;
      }
      
      this.form.patchValue({
        tenantId: selected.tenantId,
        name: selected.name,
        description: selected.description || '',
        maxDurationHours: selected.maxDurationHours,
        isActive: selected.isActive,
      }, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.loadTenantsAndAmenities();
  }

  setSearch(val: string): void { this.searchTerm.set(val); this.page.set(1); }
  setFilter(val: AmenityFilter): void { this.activeFilter.set(val); this.page.set(1); }
  setView(view: 'grid' | 'list'): void { this.view.set(view); }

  selectAmenity(amenity: AmenityCard): void {
    this.selectedAmenityId.set(amenity.id);
    this.editorOpen.set(true);
  }

  openCreate(): void {
    this.selectedAmenityId.set(null);
    this.form.reset({
      tenantId: '',
      name: '',
      description: '',
      maxDurationHours: 1,
      isActive: true,
    }, { emitEvent: false });
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
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
      maxDurationHours: Number(payload.maxDurationHours) || 1,
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

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok(isEditing ? 'Amenidad actualizada' : 'Amenidad creada');
        this.closeEditor();
        this.loadAmenities();
      },
      error: (error) => {
        this.toast.bad(error?.error?.message || 'No se pudo guardar la amenidad');
      },
    });
  }

  askDelete(amenity: AmenityCard, ev: Event): void {
    ev.stopPropagation();
    this.toDelete.set(amenity);
  }

  cancelDelete(): void {
    this.toDelete.set(null);
  }

  confirmDelete(): void {
    const amenity = this.toDelete();
    if (!amenity) return;

    this.loading.set(true);
    this.toDelete.set(null);

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
          this.toast.ok(`Se eliminó la amenidad ${amenity.name}`);
        },
        error: (error) => {
          this.toast.bad(error?.error?.message || 'No se pudo eliminar la amenidad');
        },
      });
  }

  previousPage(): void {
    if (this.page() > 1) this.page.update((current) => current - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) this.page.update((current) => current + 1);
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages()) this.page.set(pageNumber);
  }

  onTenantFilterChange(ev: any): void {
    this.viewTenantId.set(ev.target.value);
    this.page.set(1);
    this.loadAmenities();
  }

  initials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return 'AM';
    return trimmed.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  }

  relativeTime(value: Date): string {
    const minutes = Math.max(1, Math.round((Date.now() - value.getTime()) / 60_000));
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    return `hace ${days} d`;
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

    let url = '/amenities';
    if (this.isSuperadmin() && this.viewTenantId()) {
      url += `?tenantId=${encodeURIComponent(this.viewTenantId())}`;
    }

    this.api
      .get<{ success: boolean; amenities: Amenity[] }>(url)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const amenities = Array.isArray(response.amenities) ? response.amenities : [];
          this.amenities.set(amenities.map((amenity, index) => this.toAmenityCard(amenity, index)));
        },
        error: (error) => {
          this.toast.bad(error?.error?.message || 'No se pudieron cargar las amenidades');
        },
      });
  }

  private toAmenityCard(amenity: Amenity, index: number): AmenityCard {
    return {
      id: amenity._id,
      tenantId: amenity.tenantId,
      name: amenity.name,
      description: amenity.description,
      maxDurationHours: amenity.maxDurationHours || 1,
      isActive: amenity.isActive !== false,
      tenant: this.resolveTenantName(amenity.tenantId),
      createdAt: amenity.createdAt ? new Date(amenity.createdAt) : new Date(),
      avatarBg: AVATAR_BACKGROUNDS[index % AVATAR_BACKGROUNDS.length],
    };
  }

  private resolveTenantName(tenantId: string): string {
    const tenant = this.tenants().find((current) => current._id === tenantId);
    return tenant?.name || tenantId;
  }
}
