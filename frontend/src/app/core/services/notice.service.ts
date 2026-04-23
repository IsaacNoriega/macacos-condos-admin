import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Notice, NoticeResponse } from '../models/notice.model';

@Injectable({ providedIn: 'root' })
export class NoticeService {
  readonly notices = signal<Notice[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly api: ApiService) {}

  createNotice(notice: { tenantId: string; title: string; message: string }) {
    return this.api.post<{ success: boolean; notice: Notice }>('/notices', notice);
  }

  fetchNotices(tenantId: string) {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<NoticeResponse>(`/notices/${tenantId}`).subscribe({
      next: (res) => {
        this.notices.set(res.notices);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al cargar avisos');
        this.loading.set(false);
      },
    });
  }
}
