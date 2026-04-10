import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { UserRole } from '../../core/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface DashboardCardConfig {
  label: string;
  endpoint: string;
  key: string;
  roles: UserRole[];
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

  private readonly cardConfig: DashboardCardConfig[] = [
    { label: 'Usuarios', endpoint: '/users', key: 'users', roles: ['superadmin', 'admin'] },
    { label: 'Unidades', endpoint: '/units', key: 'units', roles: ['superadmin', 'admin'] },
    { label: 'Residentes', endpoint: '/residents', key: 'residents', roles: ['superadmin', 'admin'] },
    { label: 'Cargos', endpoint: '/charges', key: 'charges', roles: ['superadmin', 'admin'] },
    { label: 'Pagos', endpoint: '/payments', key: 'payments', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
    { label: 'Amenidades', endpoint: '/amenities', key: 'amenities', roles: ['superadmin', 'admin'] },
    {
      label: 'Reservaciones',
      endpoint: '/reservations',
      key: 'reservations',
      roles: ['superadmin', 'admin', 'residente', 'familiar'],
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
          const list = responses[index][card.key];
          return {
            ...card,
            value: Array.isArray(list) ? list.length : 0,
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
}
