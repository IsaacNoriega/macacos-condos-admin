import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CrudConfig, Tenant } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

interface TenantCard extends Tenant {
  isActive: boolean;
}

const config: CrudConfig = {
  title: 'Inquilinos (Condominios)',
  endpoint: '/tenants',
  listKey: 'tenants',
  singularKey: 'tenant',
  fields: [
    { key: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Condominio Vista Norte' },
    { key: 'address', label: 'Dirección', type: 'text', required: true },
    { key: 'contactEmail', label: 'Email de contacto', type: 'email', required: true },
  ],
};

@Component({
  selector: 'app-tenants-page',
  standalone: true,
  imports: [CrudPageComponent, CommonModule],
  template: `
    <section class="tenants-page-shell">
      <header class="tenants-hero">
        <div class="hero-copy">
          <p class="eyebrow">Gestion administrativa</p>
          <h1>Gestion de Inquilinos (Condominios)</h1>
          <p>Administra los condominios registrados y sus datos de contacto desde un solo lugar.</p>
        </div>
      </header>

      @if (tenants().length > 0) {
      <section class="tenant-cards-section">
        <p class="section-label">Condominios registrados</p>
        <div class="tenant-cards-grid">
          @for (tenant of tenants(); track tenant._id) {
          <article class="tenant-card">
            <div class="tenant-card-head">
              <div class="tenant-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <span class="status-badge" [class.badge-active]="tenant.isActive" [class.badge-inactive]="!tenant.isActive">
                {{ tenant.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <h3 class="tenant-name">{{ tenant.name }}</h3>

            <p class="tenant-address">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {{ tenant.address }}
            </p>

            <p class="tenant-email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              {{ tenant.contactEmail }}
            </p>

            <div class="tenant-card-foot">
              <button
                class="toggle-btn"
                type="button"
                [class.toggle-active]="tenant.isActive"
                (click)="toggleTenant(tenant)"
                [attr.aria-label]="tenant.isActive ? 'Desactivar condominio' : 'Activar condominio'"
              >
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
                <span class="toggle-label">{{ tenant.isActive ? 'Activo' : 'Inactivo' }}</span>
              </button>
            </div>
          </article>
          }
        </div>
      </section>
      }

      <app-crud-page [config]="config" />
    </section>
  `,
  styles: [
    `
      .tenants-page-shell {
        display: grid;
        gap: 0.9rem;
        width: min(96%, 1320px);
        margin: 0 auto;
      }

      .tenants-hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.5rem;
        border-radius: var(--radius-xl);
        background: var(--hero-bg);
        color: var(--text-on-primary);
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow: var(--hero-shadow);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      .hero-copy {
        display: grid;
        gap: 0.25rem;
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.68rem;
        font-weight: 800;
        opacity: 0.8;
      }

      .tenants-hero h1 {
        margin: 0;
        color: var(--text-on-primary);
        font-size: clamp(1.45rem, 3vw, 2.1rem);
        letter-spacing: -0.03em;
      }

      .tenants-hero p {
        margin: 0;
        max-width: 60ch;
        color: rgba(255, 255, 255, 0.86);
      }

      /* ── Cards section ── */

      .tenant-cards-section {
        display: grid;
        gap: 0.65rem;
      }

      .section-label {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.68rem;
        font-weight: 800;
        color: var(--text-muted);
      }

      .tenant-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
        gap: 0.85rem;
      }

      .tenant-card {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        padding: 1.15rem;
        display: grid;
        gap: 0.5rem;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      }

      .tenant-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(14, 165, 233, 0.1);
        border-color: rgba(14, 165, 233, 0.25);
      }

      .tenant-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .tenant-icon {
        width: 2.4rem;
        height: 2.4rem;
        display: grid;
        place-items: center;
        border-radius: var(--radius-md);
        background: rgba(14, 165, 233, 0.08);
        color: var(--color-primary);
        flex-shrink: 0;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.26rem 0.62rem;
        border-radius: var(--radius-pill);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .badge-active {
        background: rgba(16, 185, 129, 0.12);
        color: #059669;
      }

      .badge-inactive {
        background: rgba(148, 163, 184, 0.15);
        color: var(--text-muted);
      }

      .tenant-name {
        margin: 0.25rem 0 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-heading);
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .tenant-address,
      .tenant-email {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.38rem;
        font-size: 0.8rem;
        color: var(--text-muted);
        font-weight: 500;
        min-width: 0;
        word-break: break-word;
      }

      .tenant-address svg,
      .tenant-email svg {
        flex-shrink: 0;
        opacity: 0.7;
      }

      /* ── Toggle button ── */

      .tenant-card-foot {
        margin-top: 0.5rem;
        padding-top: 0.65rem;
        border-top: 1px solid var(--glass-border);
      }

      .toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.52rem;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font: inherit;
        color: var(--text-secondary);
        font-size: 0.82rem;
        font-weight: 600;
      }

      .toggle-track {
        display: inline-block;
        width: 2.2rem;
        height: 1.25rem;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.45);
        border: 1px solid rgba(148, 163, 184, 0.4);
        position: relative;
        transition: background 0.22s ease, border-color 0.22s ease;
        flex-shrink: 0;
      }

      .toggle-thumb {
        position: absolute;
        top: 50%;
        left: 0.1rem;
        width: 0.95rem;
        height: 0.95rem;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
        transform: translateY(-50%);
        transition: transform 0.22s ease;
      }

      .toggle-btn.toggle-active .toggle-track {
        background: var(--color-primary);
        border-color: var(--color-primary-dark);
      }

      .toggle-btn.toggle-active .toggle-thumb {
        transform: translate(0.95rem, -50%);
      }

      .toggle-btn:hover .toggle-track {
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
      }

      .toggle-label {
        line-height: 1;
      }

      @media (max-width: 860px) {
        .tenants-hero {
          padding: 1.15rem;
        }

        .tenant-cards-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TenantsPage {
  readonly config = config;
  readonly tenants = signal<TenantCard[]>([]);

  constructor(private readonly api: ApiService) {
    this.loadTenants();
  }

  toggleTenant(tenant: TenantCard): void {
    const updatedIsActive = !tenant.isActive;
    this.api
      .put<{ success: boolean }>(`/tenants/${tenant._id}`, { isActive: updatedIsActive })
      .subscribe({
        next: () => {
          this.tenants.update((list) =>
            list.map((t) => (t._id === tenant._id ? { ...t, isActive: updatedIsActive } : t))
          );
        },
        error: () => {},
      });
  }

  private loadTenants(): void {
    this.api.get<{ success: boolean; tenants: Tenant[] }>('/tenants').subscribe({
      next: (response) => {
        const tenants = Array.isArray(response.tenants) ? response.tenants : [];
        this.tenants.set(
          tenants.map((t) => ({
            ...t,
            isActive: (t as unknown as Record<string, unknown>)['isActive'] !== false,
          }))
        );
      },
      error: () => this.tenants.set([]),
    });
  }
}
