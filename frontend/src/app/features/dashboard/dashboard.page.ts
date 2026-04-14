import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { UserRole } from '../../core/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface DashboardBar {
  label: string;
  value: number;
  percent: number;
  color: string;
}

interface DashboardGroup {
  label: string;
  value: number;
  percent: number;
  color: string;
}

interface DashboardKpiCard {
  label: string;
  sourceKey: string;
  value: number;
  previousValue: number;
  delta: number;
  deltaPercent: number;
  trend: 'up' | 'down' | 'flat';
  color: string;
  note: string;
}

interface DashboardTrendPoint {
  x: number;
  y: number;
}

interface DashboardTrendSeries {
  label: string;
  color: string;
  values: number[];
  points: string;
  latest: number;
  previous: number;
  delta: number;
  deltaPercent: number;
}

interface DashboardMonthWindow {
  key: string;
  label: string;
  start: number;
  end: number;
}

interface DashboardSourceConfig {
  key: string;
  label: string;
  endpoint: string;
  listKey: string;
  dateKey: string;
  roles: UserRole[];
  color: string;
  filter?: (item: Record<string, unknown>) => boolean;
}

interface DashboardSourceState extends DashboardSourceConfig {
  items: Record<string, unknown>[];
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DASHBOARD_COLORS = {
  users: '#38bdf8',
  payments: '#60a5fa',
  reservations: '#a78bfa',
  maintenance: '#f59e0b',
  charges: '#34d399',
  residents: '#22c55e',
  amenities: '#f472b6',
};
const CHART_WIDTH = 100;
const CHART_HEIGHT = 100;

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage implements OnInit {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly now = signal(new Date());
  readonly sources = signal<DashboardSourceState[]>([]);

  readonly monthWindows = computed(() => buildMonthWindows(this.now(), 6));

  readonly kpiCards = computed<DashboardKpiCard[]>(() => {
    const windows = this.monthWindows();
    const currentWindow = windows[windows.length - 1];
    const previousWindow = windows[windows.length - 2] ?? currentWindow;
    const currentMonth = this.countsByMonth(currentWindow);
    const previousMonth = this.countsByMonth(previousWindow);

    const kpiConfigs = [
      { key: 'users', label: 'Nuevos usuarios', note: 'Altas del mes', color: DASHBOARD_COLORS.users },
      { key: 'payments', label: 'Pagos confirmados', note: 'Pagos cerrados', color: DASHBOARD_COLORS.payments },
      { key: 'reservations', label: 'Reservaciones nuevas', note: 'Alta de reservas', color: DASHBOARD_COLORS.reservations },
      { key: 'maintenance', label: 'Mantenimientos', note: 'Reportes abiertos', color: DASHBOARD_COLORS.maintenance },
    ];

    return kpiConfigs
      .map((config) => {
        const current = currentMonth.get(config.key) ?? 0;
        const previous = previousMonth.get(config.key) ?? 0;
        const delta = current - previous;
        const deltaPercent = previous === 0 ? (current === 0 ? 0 : 100) : Math.round((delta / previous) * 100);

        return {
          label: config.label,
          sourceKey: config.key,
          value: current,
          previousValue: previous,
          delta,
          deltaPercent,
          trend: (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
          color: config.color,
          note: config.note,
        };
      })
      .filter((card) => this.hasSource(card.sourceKey));
  });

  readonly chartBars = computed<DashboardBar[]>(() => {
    const currentMonth = this.countsByMonth(this.monthWindows()[this.monthWindows().length - 1]);
    const barConfigs = [
      { key: 'users', label: 'Usuarios', color: DASHBOARD_COLORS.users },
      { key: 'payments', label: 'Pagos', color: DASHBOARD_COLORS.payments },
      { key: 'reservations', label: 'Reservas', color: DASHBOARD_COLORS.reservations },
      { key: 'maintenance', label: 'Mantenimiento', color: DASHBOARD_COLORS.maintenance },
      { key: 'charges', label: 'Cargos', color: DASHBOARD_COLORS.charges },
    ];

    const bars = barConfigs
      .map((config) => ({
        sourceKey: config.key,
        label: config.label,
        value: currentMonth.get(config.key) ?? 0,
        color: config.color,
        percent: 0,
      }))
      .filter((bar) => this.hasSource(bar.sourceKey));

    const maxValue = Math.max(...bars.map((bar) => bar.value), 1);
    return bars.map((bar) => ({
      ...bar,
      percent: Math.round((bar.value / maxValue) * 100),
    }));
  });

  readonly chartGroups = computed<DashboardGroup[]>(() => {
    const currentMonth = this.countsByMonth(this.monthWindows()[this.monthWindows().length - 1]);
    const groups = [
      { label: 'Personas', value: (currentMonth.get('users') ?? 0) + (currentMonth.get('residents') ?? 0), color: DASHBOARD_COLORS.users },
      { label: 'Operación', value: (currentMonth.get('reservations') ?? 0) + (currentMonth.get('maintenance') ?? 0) + (currentMonth.get('amenities') ?? 0), color: DASHBOARD_COLORS.reservations },
      { label: 'Finanzas', value: (currentMonth.get('charges') ?? 0) + (currentMonth.get('payments') ?? 0), color: DASHBOARD_COLORS.payments },
    ];

    const total = groups.reduce((sum, group) => sum + group.value, 0) || 1;
    return groups.map((group) => ({
      ...group,
      percent: Math.round((group.value / total) * 100),
    }));
  });

  readonly donutGradient = computed(() => {
    const groups = this.chartGroups();
    const total = groups.reduce((sum, group) => sum + group.value, 0) || 1;

    let cursor = 0;
    const segments = groups.map((group) => {
      const start = cursor;
      cursor += (group.value / total) * 100;
      return `${group.color} ${start}% ${cursor}%`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  });

  readonly totalMetrics = computed(() => this.chartGroups().reduce((sum, group) => sum + group.value, 0));

  readonly lineSeries = computed<DashboardTrendSeries[]>(() => {
    const windows = this.monthWindows();
    const seriesConfigs = [
      { key: 'users', label: 'Usuarios', color: DASHBOARD_COLORS.users },
      { key: 'payments', label: 'Pagos', color: DASHBOARD_COLORS.payments },
      { key: 'reservations', label: 'Reservas', color: DASHBOARD_COLORS.reservations },
      { key: 'maintenance', label: 'Mantenimiento', color: DASHBOARD_COLORS.maintenance },
    ];

    return seriesConfigs
      .map((config) => {
        const collection = this.sources().find((source) => source.key === config.key);
        if (!collection) {
          return null;
        }

        const values = windows.map((window) => this.countItemsForWindow(collection, window));
        const maxValue = Math.max(...values, 1);
        const points = values
          .map((value, index) => {
            const x = windows.length === 1 ? 50 : (index / (windows.length - 1)) * CHART_WIDTH;
            const y = CHART_HEIGHT - (value / maxValue) * CHART_HEIGHT;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ');

        const latest = values.at(-1) ?? 0;
        const previous = values.at(-2) ?? 0;
        const delta = latest - previous;
        const deltaPercent = previous === 0 ? (latest === 0 ? 0 : 100) : Math.round((delta / previous) * 100);

        return {
          label: config.label,
          color: config.color,
          values,
          points,
          latest,
          previous,
          delta,
          deltaPercent,
        };
      })
      .filter((series): series is DashboardTrendSeries => series !== null);
  });

  constructor(
    private readonly api: ApiService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    document.documentElement.classList.add('dashboard-no-scroll');
    this.refresh();
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('dashboard-no-scroll');
  }

  refresh(): void {
    const sourceConfig = this.getSourcesForCurrentRole();
    this.sources.set(sourceConfig.map((source) => ({ ...source, items: [] })));

    if (!sourceConfig.length) {
      this.loading.set(false);
      this.error.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.now.set(new Date());

    forkJoin(sourceConfig.map((source) => this.api.get<Record<string, unknown>>(source.endpoint))).subscribe({
      next: (responses) => {
        const updated = sourceConfig.map((source, index) => {
          const response = responses[index] as Record<string, unknown>;
          const list = response[source.listKey];

          return {
            ...source,
            items: Array.isArray(list) ? (list as Record<string, unknown>[]) : [],
          };
        });
        this.sources.set(updated);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudieron cargar métricas del dashboard.');
        this.loading.set(false);
      },
    });
  }

  private getSourcesForCurrentRole(): DashboardSourceConfig[] {
    const role = this.auth.role();
    if (!role) {
      return [];
    }

    return DASHBOARD_SOURCE_CONFIGS.filter((source) => source.roles.includes(role));
  }

  private hasSource(sourceKey: string): boolean {
    return this.sources().some((source) => source.key === sourceKey);
  }

  private countsByMonth(window: DashboardMonthWindow): Map<string, number> {
    const counts = new Map<string, number>([
      ['users', 0],
      ['residents', 0],
      ['payments', 0],
      ['charges', 0],
      ['reservations', 0],
      ['maintenance', 0],
      ['amenities', 0],
    ]);

    for (const source of this.sources()) {
      counts.set(source.key, this.countItemsForWindow(source, window));
    }

    return counts;
  }

  private countItemsForWindow(source: DashboardSourceState, window: DashboardMonthWindow): number {
    return source.items.filter((item) => {
      if (source.filter && !source.filter(item)) {
        return false;
      }

      const timestamp = this.resolveTimestamp(item[source.dateKey]);
      return timestamp !== null && timestamp >= window.start && timestamp < window.end;
    }).length;
  }

  private resolveTimestamp(value: unknown): number | null {
    if (typeof value !== 'string' && !(value instanceof Date)) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  userInitials(): string {
    const name = this.auth.user()?.name?.trim() || '';
    if (!name) {
      return 'AD';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    return initials || name.slice(0, 2).toUpperCase();
  }
}

function buildMonthWindows(anchor: Date, months: number): DashboardMonthWindow[] {
  const windows: DashboardMonthWindow[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1);
    const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();

    windows.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`,
      start,
      end,
    });
  }

  return windows;
}

const DASHBOARD_SOURCE_CONFIGS: DashboardSourceConfig[] = [
  {
    key: 'users',
    label: 'Usuarios',
    endpoint: '/users',
    listKey: 'users',
    dateKey: 'createdAt',
    roles: ['superadmin', 'admin'],
    color: DASHBOARD_COLORS.users,
  },
  {
    key: 'residents',
    label: 'Residentes',
    endpoint: '/residents',
    listKey: 'residents',
    dateKey: 'createdAt',
    roles: ['superadmin', 'admin'],
    color: DASHBOARD_COLORS.residents,
  },
  {
    key: 'payments',
    label: 'Pagos',
    endpoint: '/payments',
    listKey: 'payments',
    dateKey: 'paymentDate',
    roles: ['superadmin', 'admin', 'residente', 'familiar'],
    color: DASHBOARD_COLORS.payments,
    filter: (item) => {
      const status = String(item['status'] ?? '').toLowerCase();
      return status === 'paid' || status === 'completed';
    },
  },
  {
    key: 'charges',
    label: 'Cargos',
    endpoint: '/charges',
    listKey: 'charges',
    dateKey: 'createdAt',
    roles: ['superadmin', 'admin'],
    color: DASHBOARD_COLORS.charges,
  },
  {
    key: 'reservations',
    label: 'Reservaciones',
    endpoint: '/reservations',
    listKey: 'reservations',
    dateKey: 'createdAt',
    roles: ['superadmin', 'admin', 'residente', 'familiar'],
    color: DASHBOARD_COLORS.reservations,
  },
  {
    key: 'maintenance',
    label: 'Mantenimiento',
    endpoint: '/maintenance',
    listKey: 'reports',
    dateKey: 'createdAt',
    roles: ['superadmin', 'admin', 'residente', 'familiar'],
    color: DASHBOARD_COLORS.maintenance,
  },
  {
    key: 'amenities',
    label: 'Amenidades',
    endpoint: '/amenities',
    listKey: 'amenities',
    dateKey: 'createdAt',
    roles: ['superadmin', 'admin'],
    color: DASHBOARD_COLORS.amenities,
  },
];
