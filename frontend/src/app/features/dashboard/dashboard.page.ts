import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { UserRole } from '../../core/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type DashboardIcon =
  | 'users'
  | 'units'
  | 'residents'
  | 'charges'
  | 'payments'
  | 'amenities'
  | 'reservations'
  | 'maintenance'
  | 'tasks';

interface DashboardCardConfig {
  label: string;
  endpoint: string;
  key: string;
  icon: DashboardIcon;
  roles: UserRole[];
  extractor?: (response: Record<string, unknown>) => number;
}

interface DashboardCard extends DashboardCardConfig {
  value: number;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage implements OnInit {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly now = signal(new Date());
  readonly cards = signal<DashboardCard[]>([]);

  readonly cardIconPaths: Record<DashboardIcon, string> = {
    users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    units: 'M3 11.5 12 4l9 7.5V20H3v-8.5ZM9 20v-5h6v5',
    residents: 'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 20a6 6 0 0 1 12 0M19 8h3m-1.5-1.5v3',
    charges: 'M4 5h16v14H4zM7 9h10M7 13h7M15 5v14',
    payments: 'M3 7h18v10H3zM3 10h18M7 14h4M16 15h2',
    amenities: 'M4 19h16M8 19v-4l2-2 2 2 2-2 2 2v4M12 4l7 5-2 2-5-3-5 3-2-2 7-5Z',
    reservations: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
    maintenance: 'M14.7 6.3a4 4 0 0 0-5.65 5.65l-5.2 5.2a1.5 1.5 0 0 0 2.12 2.12l5.2-5.2a4 4 0 0 0 5.65-5.65l-2.12 2.12-2.12-2.12 2.12-2.12Z',
    tasks: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  };

  private readonly cardConfig: DashboardCardConfig[] = [
    { label: 'Usuarios', endpoint: '/users', key: 'users', icon: 'users', roles: ['superadmin', 'admin'] },
    { label: 'Unidades', endpoint: '/units', key: 'units', icon: 'units', roles: ['superadmin', 'admin'] },
    { label: 'Residentes', endpoint: '/residents', key: 'residents', icon: 'residents', roles: ['superadmin', 'admin'] },
    { label: 'Cargos', endpoint: '/charges', key: 'charges', icon: 'charges', roles: ['superadmin', 'admin'] },
    { label: 'Pagos', endpoint: '/payments', key: 'payments', icon: 'payments', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
    { label: 'Amenidades', endpoint: '/amenities', key: 'amenities', icon: 'amenities', roles: ['superadmin', 'admin'] },
    {
      label: 'Reservaciones',
      endpoint: '/reservations',
      key: 'reservations',
      icon: 'reservations',
      roles: ['superadmin', 'admin', 'residente', 'familiar'],
    },
    {
      label: 'Mantenimiento',
      endpoint: '/maintenance',
      key: 'reports',
      icon: 'maintenance',
      roles: ['superadmin', 'admin', 'residente', 'familiar'],
    },
    {
      label: 'Tareas Pendientes',
      endpoint: '/maintenance',
      key: 'reports',
      icon: 'tasks',
      roles: ['superadmin', 'admin', 'residente', 'familiar'],
      extractor: (response) => {
        const list = response['reports'];
        if (!Array.isArray(list)) {
          return 0;
        }

        return list.filter((item) => {
          const value = (item as { status?: unknown })?.status;
          return typeof value === 'string' && value.toLowerCase() === 'pendiente';
        }).length;
      },
    },
  ];

  constructor(
    private readonly api: ApiService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.cards.set(this.getCardsForCurrentRole().map((card) => ({ ...card, value: 0 })));
    this.refresh();
  }

  refresh(): void {
    const cardConfig = this.getCardsForCurrentRole();
    this.cards.set(cardConfig.map((card) => ({ ...card, value: 0 })));

    if (!cardConfig.length) {
      this.loading.set(false);
      this.error.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.now.set(new Date());

    forkJoin(cardConfig.map((card) => this.api.get<Record<string, unknown[]>>(card.endpoint))).subscribe({
      next: (responses) => {
        const updated = cardConfig.map((card, index) => {
          const response = responses[index] as Record<string, unknown>;
          const extractedValue = card.extractor?.(response);
          const list = response[card.key];

          return {
            ...card,
            value: typeof extractedValue === 'number' ? extractedValue : Array.isArray(list) ? list.length : 0,
          };
        });
        this.cards.set(updated);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudieron cargar métricas del dashboard.');
        this.loading.set(false);
      },
    });
  }

  private getCardsForCurrentRole(): DashboardCardConfig[] {
    const role = this.auth.role();
    if (!role) {
      return [];
    }

    return this.cardConfig.filter((card) => card.roles.includes(role));
  }

  iconPath(icon: DashboardIcon): string {
    return this.cardIconPaths[icon];
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
