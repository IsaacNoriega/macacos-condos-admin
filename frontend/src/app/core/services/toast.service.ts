import { Injectable, signal } from '@angular/core';

export type ToastKind = 'ok' | 'bad' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  msg?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  readonly toasts = signal<Toast[]>([]);

  push(input: { kind: ToastKind; title: string; msg?: string; ttl?: number }): void {
    const id = ++this.counter;
    const toast: Toast = { id, kind: input.kind, title: input.title, msg: input.msg };
    this.toasts.update((list) => [...list, toast]);

    const ttl = input.ttl ?? 4200;
    if (ttl > 0) {
      setTimeout(() => this.dismiss(id), ttl);
    }
  }

  ok(title: string, msg?: string): void {
    this.push({ kind: 'ok', title, msg });
  }

  bad(title: string, msg?: string): void {
    this.push({ kind: 'bad', title, msg });
  }

  info(title: string, msg?: string): void {
    this.push({ kind: 'info', title, msg });
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
