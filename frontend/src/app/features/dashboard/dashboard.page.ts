import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

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
  readonly cards = signal([
    { label: 'Usuarios', value: 0, endpoint: '/users', key: 'users' },
    { label: 'Unidades', value: 0, endpoint: '/units', key: 'units' },
    { label: 'Residentes', value: 0, endpoint: '/residents', key: 'residents' },
    { label: 'Cargos', value: 0, endpoint: '/charges', key: 'charges' },
    { label: 'Pagos', value: 0, endpoint: '/payments', key: 'payments' },
    { label: 'Reservaciones', value: 0, endpoint: '/reservations', key: 'reservations' },
  ]);

  constructor(
    private readonly api: ApiService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    const cardConfig = this.cards();
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
}
