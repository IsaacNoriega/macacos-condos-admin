import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MaintenanceReport, Tenant, User, UserRole } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

type MaintenanceFilter = 'all' | 'pendiente' | 'en progreso' | 'resuelto';

interface MaintenanceCard extends MaintenanceReport {
  userName: string;
  tenantName: string;
  createdAtDate: Date;
}

const FILTERS: Array<{ label: string; value: MaintenanceFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'En progreso', value: 'en progreso' },
  { label: 'Resueltos', value: 'resuelto' },
];

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FancySelectComponent,
    MacIconComponent,
    DrawerComponent,
    ConfirmModalComponent
  ],
  templateUrl: './maintenance.page.html',
  styleUrl: './maintenance.page.css',
})
export class MaintenancePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly filters = FILTERS;
  readonly searchTerm = signal('');
  readonly activeFilter = signal<MaintenanceFilter>('all');
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly view = signal<'grid' | 'list'>('grid');
  readonly loading = signal(false);
  readonly reports = signal<MaintenanceCard[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly users = signal<User[]>([]);
  readonly toDelete = signal<MaintenanceCard | null>(null);
  readonly editorOpen = signal(false);
  readonly selectedReportId = signal<string | null>(null);

  readonly currentRole = computed(() => this.auth.role() as UserRole);
  readonly isSuperadmin = computed(() => this.currentRole() === 'superadmin');
  readonly isAdmin = computed(() => this.currentRole() === 'admin');
  readonly canManage = computed(() => this.isSuperadmin() || this.isAdmin());

  readonly tenantOptions = computed(() => this.tenants().map(t => ({ label: t.name, value: t._id })));
  readonly userOptions = computed(() => this.users().map(u => ({ label: `${u.name} (${u.email})`, value: u._id })));
  readonly statusOptions = [
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'En progreso', value: 'en progreso' },
    { label: 'Resuelto', value: 'resuelto' },
  ];

  readonly form: FormGroup;
  readonly selectedReport = computed(() => this.reports().find(r => r._id === this.selectedReportId()) || null);

  readonly filteredReports = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.reports().filter(r => {
      const searchable = [r.description, r.userName, r.tenantName, r.status].join(' ').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesFilter = filter === 'all' || r.status === filter;
      return matchesQuery && matchesFilter;
    });
  });

  readonly pagedReports = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredReports().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredReports().length / this.pageSize)));

  constructor() {
    this.form = this.fb.group({
      tenantId: [''],
      userId: [''],
      description: ['', Validators.required],
      status: ['pendiente'],
      assignedTo: [''],
    });

    effect(() => {
      const selected = this.selectedReport();
      if (!selected) {
        this.form.reset({
          tenantId: '',
          userId: this.auth.user()?._id || '',
          description: '',
          status: 'pendiente',
          assignedTo: '',
        }, { emitEvent: false });
        return;
      }

      const tid = selected.tenantId ? (typeof selected.tenantId === 'string' ? selected.tenantId : selected.tenantId._id) : '';
      const uid = selected.userId ? (typeof selected.userId === 'string' ? selected.userId : selected.userId._id) : '';

      this.form.patchValue({
        tenantId: tid,
        userId: uid,
        description: selected.description,
        status: selected.status,
        assignedTo: selected.assignedTo || '',
      }, { emitEvent: false });
    });
  }

  private refreshIntervalId: any;

  ngOnInit(): void {
    this.loadInitialData();
    this.refreshIntervalId = setInterval(() => this.loadReports(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) clearInterval(this.refreshIntervalId);
  }

  setSearch(val: string): void { this.searchTerm.set(val); this.page.set(1); }
  setFilter(val: MaintenanceFilter): void { this.activeFilter.set(val); this.page.set(1); }
  setView(view: 'grid' | 'list'): void { this.view.set(view); }

  openCreate(): void {
    this.selectedReportId.set(null);
    this.editorOpen.set(true);
  }

  openEdit(report: MaintenanceCard): void {
    this.selectedReportId.set(report._id);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  saveReport(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    // Clean empty strings
    Object.keys(val).forEach(key => {
      if (val[key] === '') delete val[key];
    });
    
    const isEditing = !!this.selectedReportId();
    const endpoint = isEditing ? `/maintenance/${this.selectedReportId()}` : '/maintenance';
    
    this.loading.set(true);
    const req$ = isEditing ? this.api.put(endpoint, val) : this.api.post(endpoint, val);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok(isEditing ? 'Reporte actualizado' : 'Reporte creado');
        this.closeEditor();
        this.loadReports();
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al guardar reporte')
    });
  }

  askDelete(report: MaintenanceCard, ev: Event): void {
    ev.stopPropagation();
    this.toDelete.set(report);
  }

  confirmDelete(): void {
    const report = this.toDelete();
    if (!report) return;

    this.loading.set(true);
    this.api.delete(`/maintenance/${report._id}`).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok('Reporte eliminado');
        this.toDelete.set(null);
        this.loadReports();
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al eliminar')
    });
  }

  private loadInitialData(): void {
    if (this.isSuperadmin()) {
      this.api.get<{ tenants: Tenant[] }>('/tenants').subscribe(res => this.tenants.set(res.tenants || []));
    }
    if (this.canManage()) {
      this.api.get<{ users: User[] }>('/users').subscribe(res => this.users.set(res.users || []));
    }
    this.loadReports();
  }

  private loadReports(): void {
    this.loading.set(true);
    this.api.get<{ reports: MaintenanceReport[] }>('/maintenance')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          const raw = res.reports || [];
          this.reports.set(raw.map(r => ({
            ...r,
            userName: this.resolveUserName(r.userId),
            tenantName: this.resolveTenantName(r.tenantId),
            createdAtDate: r.createdAt ? new Date(r.createdAt) : new Date(),
          })));
        },
        error: (err) => this.toast.bad(err?.error?.message || 'Error al cargar reportes')
      });
  }

  private resolveUserName(val: any): string {
    if (val && typeof val === 'object' && val.name) return val.name;
    if (typeof val === 'string') {
      const u = this.users().find(u => u._id === val);
      if (u) return u.name;
    }
    return 'Usuario';
  }

  private resolveTenantName(val: any): string {
    if (val && typeof val === 'object' && val.name) return val.name;
    if (typeof val === 'string') {
      const t = this.tenants().find(t => t._id === val);
      if (t) return t.name;
    }
    return 'Condominio';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'resuelto': return 'ok';
      case 'en progreso': return 'info';
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
}
