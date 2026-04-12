import { Component } from '@angular/core';
import { CrudConfig } from '../../../core/api.models';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';

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
  imports: [CrudPageComponent],
  template: `
    <section class="tenants-page-shell">
      <header class="tenants-hero">
        <div class="hero-copy">
          <p class="eyebrow">Gestion administrativa</p>
          <h1>Gestion de Inquilinos (Condominios)</h1>
          <p>Administra los condominios registrados y sus datos de contacto desde un solo lugar.</p>
        </div>
      </header>

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

      @media (max-width: 860px) {
        .tenants-hero {
          padding: 1.15rem;
        }
      }
    `,
  ],
})
export class TenantsPage {
  readonly config = config;
}
