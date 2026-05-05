import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Tenant } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

interface TenantCard extends Tenant {
  isActive: boolean;
}

@Component({
  selector: 'app-tenants-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MacIconComponent,
    DrawerComponent,
    ConfirmModalComponent
  ],
  templateUrl: './tenants.page.html',
  styleUrl: './tenants.page.css',
})
export class TenantsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly searchTerm = signal('');
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly view = signal<'grid' | 'list'>('grid');
  readonly loading = signal(false);
  readonly tenants = signal<TenantCard[]>([]);
  readonly toDelete = signal<TenantCard | null>(null);
  readonly editorOpen = signal(false);
  readonly selectedTenantId = signal<string | null>(null);

  readonly form: FormGroup;
  readonly selectedTenant = computed(() => this.tenants().find(t => t._id === this.selectedTenantId()) || null);

  readonly filteredTenants = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    return this.tenants().filter(t => {
      const searchable = [t.name, t.address, t.contactEmail].join(' ').toLowerCase();
      return !query || searchable.includes(query);
    });
  });

  readonly pagedTenants = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredTenants().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTenants().length / this.pageSize)));

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      identifier: [''],
      address: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      isActive: [true],
    });

    effect(() => {
      const selected = this.selectedTenant();
      if (!selected) {
        this.form.reset({
          name: '',
          identifier: '',
          address: '',
          contactEmail: '',
          isActive: true,
        }, { emitEvent: false });
        return;
      }

      this.form.patchValue({
        name: selected.name,
        identifier: (selected as any).identifier || '',
        address: selected.address,
        contactEmail: selected.contactEmail,
        isActive: selected.isActive,
      }, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.loadTenants();
  }

  setSearch(val: string): void {
    this.searchTerm.set(val);
    this.page.set(1);
  }

  setView(view: 'grid' | 'list'): void {
    this.view.set(view);
  }

  initials(name: string): string {
    return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  openCreate(): void {
    this.selectedTenantId.set(null);
    this.editorOpen.set(true);
  }

  openEdit(tenant: TenantCard): void {
    this.selectedTenantId.set(tenant._id);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  saveTenant(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    const isEditing = !!this.selectedTenantId();
    const endpoint = isEditing ? `/tenants/${this.selectedTenantId()}` : '/tenants';
    
    this.loading.set(true);
    const req$ = isEditing ? this.api.put(endpoint, val) : this.api.post(endpoint, val);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok(isEditing ? 'Condominio actualizado' : 'Condominio creado');
        this.closeEditor();
        this.loadTenants();
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al guardar condominio')
    });
  }

  toggleTenant(tenant: TenantCard, ev: Event): void {
    ev.stopPropagation();
    const newState = !tenant.isActive;
    
    this.api.put(`/tenants/${tenant._id}`, { isActive: newState }).subscribe({
      next: () => {
        this.toast.ok(newState ? 'Condominio activado' : 'Condominio desactivado');
        this.tenants.update(list => list.map(t => t._id === tenant._id ? { ...t, isActive: newState } : t));
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al cambiar estado')
    });
  }

  askDelete(tenant: TenantCard, ev: Event): void {
    ev.stopPropagation();
    this.toDelete.set(tenant);
  }

  confirmDelete(): void {
    const tenant = this.toDelete();
    if (!tenant) return;

    this.loading.set(true);
    this.api.delete(`/tenants/${tenant._id}`).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok('Condominio eliminado');
        this.toDelete.set(null);
        this.loadTenants();
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al eliminar')
    });
  }

  private loadTenants(): void {
    this.loading.set(true);
    this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const raw = response.tenants || [];
          this.tenants.set(raw.map(t => ({
            ...t,
            isActive: (t as any).isActive !== false
          })));
        },
        error: (err) => {
          this.toast.bad(err?.error?.message || 'Error al cargar condominios');
          this.tenants.set([]);
        }
      });
  }
}
