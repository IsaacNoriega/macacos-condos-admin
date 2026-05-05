import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Tenant, Notice, UserRole } from '../../../core/api.models';
import { ToastService } from '../../../core/services/toast.service';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';

type NoticeCategoryFilter = 'all' | 'info' | 'urgente' | 'evento';

@Component({
  selector: 'app-notices-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MacIconComponent,
    DrawerComponent,
    ConfirmModalComponent,
    FancySelectComponent,
  ],
  templateUrl: './notices.page.html',
  styleUrl: './notices.page.css',
})
export class NoticesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly notices = signal<Notice[]>([]);
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly view = signal<'grid' | 'list'>('grid');
  readonly loading = signal(false);
  readonly searchTerm = signal('');
  readonly activeFilter = signal<NoticeCategoryFilter>('all');
  readonly editorOpen = signal(false);
  readonly selectedNoticeId = signal<string | null>(null);
  readonly toDelete = signal<Notice | null>(null);
  readonly tenants = signal<Tenant[]>([]);

  readonly isStaff = computed(() => ['superadmin', 'admin'].includes(this.auth.role() ?? ''));
  readonly isSuperadmin = computed(() => this.auth.role() === 'superadmin');
  readonly selectedFilterTenantId = signal<string>('');

  readonly filters: Array<{ label: string; value: NoticeCategoryFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Información', value: 'info' },
    { label: 'Urgentes', value: 'urgente' },
    { label: 'Eventos', value: 'evento' },
  ];

  readonly categoryOptions = [
    { label: 'Información', value: 'info' },
    { label: 'Urgente', value: 'urgente' },
    { label: 'Evento', value: 'evento' },
  ];

  readonly form: FormGroup;

  readonly filteredNotices = computed(() => {
    const query = this.searchTerm().toLowerCase();
    const filter = this.activeFilter();

    return this.notices()
      .filter((n) => {
        const matchesQuery =
          !query ||
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query);
        const matchesFilter = filter === 'all' || n.category === filter;
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  readonly pagedNotices = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredNotices().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredNotices().length / this.pageSize)),
  );
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      content: ['', [Validators.required, Validators.maxLength(1000)]],
      category: ['info', Validators.required],
      tenantId: [''],
    });

    effect(() => {
      const id = this.selectedNoticeId();
      if (!id) {
        this.form.reset({
          category: 'info',
          tenantId: this.auth.user()?.tenantId || '',
        });
        return;
      }
      const notice = this.notices().find((n) => n._id === id);
      if (notice) {
        this.form.patchValue({
          title: notice.title,
          content: notice.content,
          category: notice.category,
          tenantId: notice.tenantId,
        });
      }
    });
  }

  ngOnInit(): void {
    this.loadNotices();
    if (this.isSuperadmin()) {
      this.loadTenants();
    }
  }

  loadTenants(): void {
    this.api.get<{ tenants: Tenant[] }>('/tenants').subscribe({
      next: (res) => this.tenants.set(res.tenants || []),
      error: () => this.toast.bad('Error al cargar condominios'),
    });
  }

  loadNotices(): void {
    this.loading.set(true);
    let url = '/notices';
    const filterTenant = this.selectedFilterTenantId();
    if (this.isSuperadmin() && filterTenant) {
      url += `?tenantId=${filterTenant}`;
    }

    this.api
      .get<{ notices: Notice[] }>(url)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.notices.set(res.notices || []),
        error: () => this.toast.bad('Error al cargar avisos'),
      });
  }

  onFilterTenantChange(ev: any): void {
    this.selectedFilterTenantId.set(ev.target.value);
    this.loadNotices();
  }

  setSearch(val: string): void {
    this.searchTerm.set(val);
    this.page.set(1);
  }

  setFilter(val: NoticeCategoryFilter): void {
    this.activeFilter.set(val);
    this.page.set(1);
  }

  setView(view: 'grid' | 'list'): void {
    this.view.set(view);
  }

  openCreate(): void {
    this.selectedNoticeId.set(null);
    this.editorOpen.set(true);
  }

  openEdit(notice: Notice): void {
    if (!this.isStaff()) return;
    this.selectedNoticeId.set(notice._id);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  selectNotice(notice: Notice): void {
    this.openEdit(notice);
  }

  saveNotice(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const val = this.form.value;
    const id = this.selectedNoticeId();

    const req$ = id ? this.api.put(`/notices/${id}`, val) : this.api.post('/notices', val);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toast.ok(id ? 'Aviso actualizado' : 'Aviso publicado');
        this.closeEditor();
        this.loadNotices();
      },
      error: (err) => this.toast.bad(err?.error?.message || 'Error al guardar aviso'),
    });
  }

  askDelete(notice: Notice, ev: Event): void {
    ev.stopPropagation();
    this.toDelete.set(notice);
  }

  confirmDelete(): void {
    const notice = this.toDelete();
    if (!notice) return;

    this.loading.set(true);
    this.api
      .delete(`/notices/${notice._id}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toast.ok('Aviso eliminado');
          this.toDelete.set(null);
          this.loadNotices();
        },
        error: () => this.toast.bad('Error al eliminar aviso'),
      });
  }

  // ─── Pagination ─────────────────────────────────────────────────────────
  previousPage(): void {
    if (this.page() > 1) this.page.update((c) => c - 1);
  }
  nextPage(): void {
    if (this.page() < this.totalPages()) this.page.update((c) => c + 1);
  }
  goToPage(n: number): void {
    if (n >= 1 && n <= this.totalPages()) this.page.set(n);
  }

  getCategoryIcon(cat: string): any {
    switch (cat) {
      case 'urgente':
        return 'alert';
      case 'evento':
        return 'calendar';
      default:
        return 'info';
    }
  }

  getCategoryColor(cat: string): string {
    switch (cat) {
      case 'urgente':
        return 'danger';
      case 'evento':
        return 'primary';
      case 'info':
        return 'info';
      default:
        return 'navy';
    }
  }

  relativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return 'ahora';
    if (diff < 60) return `hace ${diff}m`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }
}
