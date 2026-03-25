import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CrudConfig } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-crud-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crud-page.component.html',
  styleUrl: './crud-page.component.css',
})
export class CrudPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  @Input({ required: true }) config!: CrudConfig;

  readonly items = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.group({});

  ngOnInit(): void {
    this.buildForm();
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api
      .get<Record<string, unknown[]>>(`${this.config.endpoint}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const list = response[this.config.listKey];
          this.items.set(Array.isArray(list) ? (list as Record<string, unknown>[]) : []);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'No se pudo cargar la información.');
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.normalizePayload(this.form.getRawValue());
    const editingId = this.editingId();

    this.saving.set(true);
    this.errorMessage.set(null);

    const request$ = editingId
      ? this.api.put<Record<string, unknown>>(`${this.config.endpoint}/${editingId}`, payload)
      : this.api.post<Record<string, unknown>>(`${this.config.endpoint}`, payload);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.successMessage.set(editingId ? 'Registro actualizado.' : 'Registro creado.');
        this.resetForm();
        this.loadItems();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'No se pudo guardar el registro.');
      },
    });
  }

  startEdit(item: Record<string, unknown>): void {
    const id = item['_id'];
    if (typeof id !== 'string') {
      return;
    }

    this.editingId.set(id);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const patch: Record<string, unknown> = {};
    for (const field of this.config.fields) {
      const rawValue = item[field.key];
      if (field.type === 'date' && typeof rawValue === 'string') {
        patch[field.key] = rawValue.slice(0, 10);
      } else if (field.type === 'datetime-local' && typeof rawValue === 'string') {
        patch[field.key] = rawValue.slice(0, 16);
      } else {
        patch[field.key] = rawValue ?? '';
      }
    }

    this.form.patchValue(patch);
  }

  deleteItem(item: Record<string, unknown>): void {
    const id = item['_id'];
    if (typeof id !== 'string') {
      return;
    }

    this.deletingId.set(id);
    this.errorMessage.set(null);

    this.api
      .delete<{ success: boolean; message?: string }>(`${this.config.endpoint}/${id}`)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set('Registro eliminado.');
          if (this.editingId() === id) {
            this.resetForm();
          }
          this.loadItems();
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'No se pudo eliminar el registro.');
        },
      });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset(this.emptyFormValues());
  }

  trackById(_: number, item: Record<string, unknown>): string {
    return typeof item['_id'] === 'string' ? (item['_id'] as string) : crypto.randomUUID();
  }

  shouldDisplayAsDate(key: string): boolean {
    return ['createdAt', 'dueDate', 'paymentDate', 'start', 'end'].includes(key);
  }

  formatCell(item: Record<string, unknown>, key: string): string {
    const value = item[key];
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (this.shouldDisplayAsDate(key)) {
      const dateValue = new Date(String(value));
      if (!Number.isNaN(dateValue.getTime())) {
        return new Intl.DateTimeFormat('es-MX', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(dateValue);
      }
    }

    return String(value);
  }

  isInvalid(fieldKey: string): boolean {
    const control = this.form.get(fieldKey);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private buildForm(): void {
    for (const field of this.config.fields) {
      const validators = field.required ? [Validators.required] : [];
      this.form.addControl(field.key, this.fb.control('', validators));
    }
    this.form.reset(this.emptyFormValues());
  }

  private emptyFormValues(): Record<string, unknown> {
    return this.config.fields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.key] = '';
      return acc;
    }, {});
  }

  private normalizePayload(raw: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const field of this.config.fields) {
      const value = raw[field.key];
      if (value === '' || value === null || value === undefined) {
        continue;
      }

      if (field.type === 'number') {
        payload[field.key] = Number(value);
        continue;
      }

      payload[field.key] = value;
    }

    return payload;
  }
}
