import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { NoticeService } from '../../core/services/notice.service';
import { ApiService } from '../../core/services/api.service';
import { Tenant } from '../../core/api.models';
import { NoticeFormComponent } from './notice-form.component';

@Component({
  selector: 'app-notice-admin',
  standalone: true,
  imports: [CommonModule, NoticeFormComponent],
  template: `
    <section class="notice-admin-panel">
      <h2>Crear aviso general</h2>
      <app-notice-form [tenants]="tenants()" (submitNotice)="onSubmit($event)"></app-notice-form>
      <p *ngIf="success()" class="success-msg">Aviso enviado correctamente.</p>
      <p *ngIf="error()" class="error-msg">{{ error() }}</p>
    </section>
  `,
  styles: [
    `.notice-admin-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 2rem; margin-bottom: 2rem; max-width: 500px; }`,
    `.success-msg { color: #389e0d; margin-top: 1rem; }`,
    `.error-msg { color: #cf1322; margin-top: 1rem; }`
  ]
})
export class NoticeAdminComponent implements OnInit {
  readonly tenants = signal<Tenant[]>([]);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly api: ApiService, private readonly noticeService: NoticeService) {}

  ngOnInit(): void {
    this.api.get<{ tenants: Tenant[] }>('/tenants').subscribe({
      next: (res) => this.tenants.set(res.tenants),
      error: () => this.error.set('No se pudieron cargar los condominios'),
    });
  }

  onSubmit(data: { tenantId: string; title: string; message: string }) {
    this.success.set(false);
    this.error.set(null);
    this.noticeService.createNotice(data).subscribe({
      next: () => {
        this.success.set(true);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al enviar aviso');
      },
    });
  }
}
