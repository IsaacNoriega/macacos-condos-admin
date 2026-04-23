// --- Tipos y utilidades base para dashboard ---
export interface DashboardSourceConfig {
  key: string;
  label: string;
  endpoint: string;
  listKey: string;
  dateKey: string;
  color: string;
  roles: string[];
  filter?: (item: any) => boolean;
}

export interface DashboardSourceState extends DashboardSourceConfig {
  items: any[];
}

export interface DashboardMonthWindow {
  label: string;
  start: number;
  end: number;
}

// Ejemplo de configuración de fuentes para el dashboard
export const DASHBOARD_SOURCE_CONFIGS: DashboardSourceConfig[] = [
  {
    key: 'charges',
    label: 'Cargos',
    endpoint: '/charges',
    listKey: 'charges',
    dateKey: 'createdAt',
    color: '#0ea5e9',
    roles: ['superadmin', 'admin'],
  },
  {
    key: 'payments',
    label: 'Pagos',
    endpoint: '/payments',
    listKey: 'payments',
    dateKey: 'paymentDate',
    color: '#22c55e',
    roles: ['superadmin', 'admin'],
  },
  {
    key: 'maintenance',
    label: 'Mantenimiento',
    endpoint: '/maintenance',
    listKey: 'reports',
    dateKey: 'createdAt',
    color: '#f59e42',
    roles: ['superadmin', 'admin'],
  },
];

// Genera ventanas mensuales para los gráficos
export function buildMonthWindows(now: Date, months: number): DashboardMonthWindow[] {
  const windows: DashboardMonthWindow[] = [];
  const current = new Date(now);
  current.setDate(1);
  current.setHours(0, 0, 0, 0);
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(current);
    start.setMonth(current.getMonth() - i);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    windows.push({
      label: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
      start: start.getTime(),
      end: end.getTime(),
    });
  }
  return windows;
}
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { UserRole } from '../../core/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { NoticesPanelComponent } from './notices-panel.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, NoticesPanelComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage implements OnInit, OnDestroy {

    // KPIs principales
    readonly kpiCards = computed(() => {
      // Ejemplo: total de cargos, pagos y reportes de mantenimiento
      const sources = this.sources();
      const charges = sources.find(s => s.key === 'charges')?.items.length || 0;
      const payments = sources.find(s => s.key === 'payments')?.items.length || 0;
      const maintenance = sources.find(s => s.key === 'maintenance')?.items.length || 0;
      return [
        {
          label: 'Cargos',
          value: charges,
          color: '#0ea5e9',
          trend: 'up',
          delta: 2,
          deltaPercent: 5,
          note: 'Este mes',
        },
        {
          label: 'Pagos',
          value: payments,
          color: '#22c55e',
          trend: 'up',
          delta: 1,
          deltaPercent: 2,
          note: 'Este mes',
        },
        {
          label: 'Mantenimiento',
          value: maintenance,
          color: '#f59e42',
          trend: 'down',
          delta: -1,
          deltaPercent: -3,
          note: 'Este mes',
        },
      ];
    });

    // Series para gráfico de líneas (tendencia mensual)
    readonly lineSeries = computed(() => {
      const sources = this.sources();
      const months = this.monthWindows();
      return sources.map(source => {
        const values = months.map(window => this.countItemsForWindow(source, window));
        // Normaliza a 100 para SVG
        const max = Math.max(...values, 1);
        const points = values.map((v, i) => `${(i * 100) / (months.length - 1)},${100 - (v * 100) / max}`).join(' ');
        return {
          label: source.label,
          color: source.color,
          points,
          latest: values[values.length - 1] || 0,
        };
      });
    });

    // Total de métricas del periodo actual (suma de todos los items del primer source)
    readonly totalMetrics = computed(() => {
      const sources = this.sources();
      return sources[0]?.items.length || 0;
    });

    // Barras por categoría (primer source)
    readonly chartBars = computed(() => {
      const sources = this.sources();
      if (!sources[0]) return [];
      // Ejemplo: agrupa por descripción si existe
      const map = new Map<string, { value: number; color: string }>();
      for (const item of sources[0].items) {
        const label = item.description || 'Otro';
        if (!map.has(label)) map.set(label, { value: 0, color: '#0ea5e9' });
        map.get(label)!.value++;
      }
      const total = Array.from(map.values()).reduce((sum, v) => sum + v.value, 0) || 1;
      return Array.from(map.entries()).map(([label, { value, color }]) => ({
        label,
        value,
        percent: Math.round((value * 100) / total),
        color,
      }));
    });

    // Gradiente para el donut chart
    readonly donutGradient = computed(() => {
      // Puedes personalizar el gradiente según los grupos
      return 'conic-gradient(#38bdf8 0 34%, #818cf8 34% 78%, #34d399 78% 100%)';
    });

    // Grupos para la leyenda del donut chart
    readonly chartGroups = computed(() => {
      const bars = this.chartBars();
      const total = bars.reduce((sum, b) => sum + b.value, 0) || 1;
      return bars.map(bar => ({
        label: bar.label,
        value: bar.value,
        percent: Math.round((bar.value * 100) / total),
        color: bar.color,
      }));
    });
  private subscription = new Subscription();

  // Las siguientes propiedades deben declararse después del constructor para evitar el error de inicialización


  readonly isSuperAdmin = computed(() => this.auth.role() === 'superadmin');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly now = signal(new Date());
  readonly sources = signal<DashboardSourceState[]>([]);

  readonly monthWindows = computed(() => buildMonthWindows(this.now(), 6));


  constructor(
    private readonly api: ApiService,
    readonly auth: AuthService,
    private readonly noticeService: NoticeService
  ) {
    this.notices = this.noticeService.notices;
    this.noticesLoading = this.noticeService.loading;
    this.noticesError = this.noticeService.error;
  }

  notices;
  noticesLoading;
  noticesError;

  ngOnInit(): void {
    document.documentElement.classList.add('dashboard-no-scroll');

    this.refresh();

    const tenantId = this.auth.user()?.tenantId;
    if (tenantId) {
      this.noticeService.fetchNotices(tenantId);
    }
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('dashboard-no-scroll');
    this.subscription.unsubscribe(); // ✅ evitar memory leaks
  }

  refresh(): void {
    const sourceConfig = this.getSourcesForCurrentRole();

    this.sources.set(sourceConfig.map((s) => ({ ...s, items: [] })));

    if (!sourceConfig.length) {
      this.loading.set(false);
      this.error.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.now.set(new Date());

    const sub = forkJoin(
      sourceConfig.map((s) =>
        this.api.get<Record<string, unknown>>(s.endpoint)
      )
    ).subscribe({
      next: (responses) => {
        const updated = sourceConfig.map((source, index) => {
          const response = responses[index];
          const list = response?.[source.listKey];

          return {
            ...source,
            items: Array.isArray(list) ? list : [],
          };
        });

        this.sources.set(updated);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.error?.message || 'No se pudieron cargar métricas del dashboard.'
        );
        this.loading.set(false);
      },
    });

    this.subscription.add(sub); // ✅ control de subscripción
  }

  private getSourcesForCurrentRole(): DashboardSourceConfig[] {
    const role = this.auth.role();
    if (!role) return [];

    return DASHBOARD_SOURCE_CONFIGS.filter((s) =>
      s.roles.includes(role)
    );
  }

  private hasSource(sourceKey: string): boolean {
    return this.sources().some((s) => s.key === sourceKey);
  }

  private countsByMonth(window: DashboardMonthWindow): Map<string, number> {
    const counts = new Map<string, number>();

    for (const source of this.sources()) {
      counts.set(
        source.key,
        this.countItemsForWindow(source, window)
      );
    }

    return counts;
  }

  private countItemsForWindow(
    source: DashboardSourceState,
    window: DashboardMonthWindow
  ): number {
    return source.items.filter((item) => {
      if (source.filter && !source.filter(item)) return false;

      const timestamp = this.resolveTimestamp(item[source.dateKey]);
      return (
        timestamp !== null &&
        timestamp >= window.start &&
        timestamp < window.end
      );
    }).length;
  }

  private resolveTimestamp(value: unknown): number | null {
    if (!value) return null;

    const parsed = new Date(value as string);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  userInitials(): string {
    const name = this.auth.user()?.name?.trim() || '';
    if (!name) return 'AD';

    const parts = name.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
}