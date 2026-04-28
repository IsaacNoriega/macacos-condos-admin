import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { Charge as ApiCharge, Tenant, Unit, User as ApiUser } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';

type ChargeFilter = 'all' | 'pending' | 'paid';

interface ChargeCard {
  id: string;
  tenantId: string;
  unitId: string;
  userId: string;
  description: string;
  amount: number;
  dueDate: Date;
  lateFeePerDay: number;
  paymentStatus: 'pending' | 'paid';
  unitCode: string;
  userName: string;
  createdAt: Date;
}

const FILTERS: Array<{ label: string; value: ChargeFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Pagados', value: 'paid' },
];

@Component({
  selector: 'app-charges-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FancySelectComponent,
    DrawerComponent,
    ConfirmModalComponent,
    MacIconComponent,
  ],
  templateUrl: './charges.page.html',
  styleUrl: './charges.page.css',
})
export class ChargesPage implements OnInit {
  readonly filters = FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<ChargeFilter>('all');
  readonly page = signal(1);
  readonly pageSize = 9;

  readonly loading = signal(false);
  private readonly rawCharges = signal<ApiCharge[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly users = signal<ApiUser[]>([]);

  readonly charges = computed(() => {
    const units = this.units();
    const users = this.users();
    return this.rawCharges().map((c) => ({
      id: c._id,
      tenantId: c.tenantId,
      unitId: c.unitId || '',
      userId: c.userId,
      description: c.description,
      amount: c.amount,
      dueDate: new Date(c.dueDate),
      lateFeePerDay: c.lateFeePerDay || 0,
      paymentStatus: c.isPaid ? ('paid' as const) : ('pending' as const),
      unitCode: units.find((u) => u._id === c.unitId)?.code || 'N/A',
      userName: users.find((u) => u._id === c.userId)?.name || 'N/A',
      createdAt: new Date((c as any).createdAt || Date.now()),
    }));
  });

  readonly selectedTenantId = signal<string>('all');

  readonly editorOpen = signal(false);
  readonly editorMode = signal<'create' | 'edit'>('create');
  readonly detail = signal<ChargeCard | null>(null);
  readonly toDelete = signal<ChargeCard | null>(null);
  readonly editingId = signal<string | null>(null);

  readonly currentRole = computed(() => this.auth.role() ?? 'admin');
  readonly isSuperadmin = computed(() => this.currentRole() === 'superadmin');

  readonly tenantOptions = computed(() => this.tenants().map((t) => ({ label: t.name, value: t._id })));
  readonly unitOptions = computed(() => {
    const selectedTenant = this.form.get('tenantId')?.value;
    return this.units()
      .filter((u) => !selectedTenant || u.tenantId === selectedTenant)
      .map((u) => ({ value: u._id, label: u.code }));
  });
  readonly userOptions = computed(() => {
    const selectedTenant = this.form.get('tenantId')?.value;
    return this.users()
      .filter((u) => !selectedTenant || u.tenantId === selectedTenant)
      .map((u) => ({ value: u._id, label: `${u.name} (${u.email})` }));
  });

  readonly form: FormGroup;

  readonly tenantSummaries = computed(() => {
    const tenants = this.tenants();
    const allCharges = this.charges();

    return tenants.map(t => ({
      id: t._id,
      name: t.name,
      pendingCount: allCharges.filter(c => c.tenantId === t._id && c.paymentStatus === 'pending').length,
      totalCount: allCharges.filter(c => c.tenantId === t._id).length
    }));
  });

  readonly filteredCharges = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();
    const tenantId = this.selectedTenantId();

    return this.charges().filter((c) => {
      const searchable = [c.description, c.unitCode, c.userName].join(' ').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'pending' && c.paymentStatus === 'pending') ||
        (filter === 'paid' && c.paymentStatus === 'paid');

      const matchesTenant = tenantId === 'all' || c.tenantId === tenantId;

      return matchesQuery && matchesFilter && matchesTenant;
    });
  });

  readonly pagedCharges = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredCharges().slice(start, start + this.pageSize);
  });

  readonly orderedCharges = computed(() => {
    const list = this.pagedCharges();
    const result: ChargeCard[] = [];
    const rows = 2;
    const colsPerPage = 3;
    const itemsPerPage = rows * colsPerPage;

    for (let i = 0; i < list.length; i += itemsPerPage) {
      const chunk = list.slice(i, i + itemsPerPage);
      for (let c = 0; c < colsPerPage; c++) {
        // Col 1: row 0 (index 0), row 1 (index 3)
        // Col 2: row 0 (index 1), row 1 (index 4)
        // Col 3: row 0 (index 2), row 1 (index 5)
        if (chunk[c] !== undefined) result.push(chunk[c]);
        if (chunk[c + colsPerPage] !== undefined) result.push(chunk[c + colsPerPage]);
      }
    }
    return result;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredCharges().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  readonly pendingCount = computed(() => this.charges().filter((c) => c.paymentStatus === 'pending').length);

  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  constructor() {
    this.form = this.fb.group({
      tenantId: [''],
      unitId: ['', Validators.required],
      userId: ['', Validators.required],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      dueDate: ['', Validators.required],
      lateFeePerDay: [0],
    });

    effect(() => {
      const editingId = this.editingId();
      if (!editingId) return;
      const charge = this.charges().find((c) => c.id === editingId);
      if (!charge) return;

      this.form.patchValue({
        tenantId: charge.tenantId,
        unitId: charge.unitId,
        userId: charge.userId,
        description: charge.description,
        amount: charge.amount,
        dueDate: new Date(charge.dueDate).toISOString().split('T')[0],
        lateFeePerDay: charge.lateFeePerDay,
      });
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const requests = {
      tenants: this.api.get<{ tenants: Tenant[] }>('/tenants'),
      units: this.api.get<{ units: Unit[] }>('/units'),
      users: this.api.get<{ users: ApiUser[] }>('/users'),
    };

    forkJoin(requests).subscribe({
      next: (res) => {
        this.tenants.set(res.tenants.tenants || []);
        this.units.set(res.units.units || []);
        this.users.set(res.users.users || []);
        this.loadCharges();
      },
      error: () => {
        this.loading.set(false);
        this.toast.bad('Error cargando catálogos');
      },
    });
  }

  loadCharges(): void {
    this.loading.set(true);
    this.api
      .get<{ charges: ApiCharge[] }>('/charges')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => {
          this.rawCharges.set(r.charges || []);
        },
        error: (err) => this.toast.bad('Error cargando cargos', err?.error?.message),
      });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.editorMode.set('create');
    this.form.reset({ amount: 0, lateFeePerDay: 0 });
    this.editorOpen.set(true);
  }

  openEdit(charge: ChargeCard): void {
    this.editingId.set(charge.id);
    this.editorMode.set('edit');
    this.editorOpen.set(true);
  }

  openDetail(charge: ChargeCard): void {
    this.detail.set(charge);
  }

  closeEditor(): void { this.editorOpen.set(false); }
  closeDetail(): void { this.detail.set(null); }

  setSearch(v: string): void { this.searchTerm.set(v); this.page.set(1); }
  setFilter(v: ChargeFilter): void { this.activeFilter.set(v); this.page.set(1); }

  saveCharge(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const editingId = this.editingId();
    this.loading.set(true);

    const req$ = editingId
      ? this.api.put(`/charges/${editingId}`, val)
      : this.api.post('/charges', val);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok(editingId ? 'Cargo actualizado' : 'Cargo creado');
        this.closeEditor();
        this.loadCharges();
      },
      error: (err) => this.toast.bad('Error al guardar', err?.error?.message),
    });
  }

  askDelete(charge: ChargeCard, ev: Event): void {
    ev.stopPropagation();
    this.toDelete.set(charge);
  }

  cancelDelete(): void { this.toDelete.set(null); }

  confirmDelete(): void {
    const charge = this.toDelete();
    if (!charge) return;
    this.toDelete.set(null);
    this.loading.set(true);
    this.api.delete(`/charges/${charge.id}`).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok('Cargo eliminado');
        this.loadCharges();
      },
      error: (err) => this.toast.bad('Error al eliminar', err?.error?.message),
    });
  }

  previousPage(): void { if (this.page() > 1) this.page.update((p) => p - 1); }
  nextPage(): void { if (this.page() < this.totalPages()) this.page.update((p) => p + 1); }
  goToPage(n: number): void { this.page.set(n); }

  trackById(_: number, c: ChargeCard): string { return c.id; }
}
