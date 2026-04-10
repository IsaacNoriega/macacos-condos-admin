import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { CrudConfig, CrudField, CrudFieldOption } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-crud-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crud-page.component.html',
  styleUrl: './crud-page.component.css',
})
export class CrudPageComponent implements OnInit, OnDestroy {
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
  readonly dynamicOptions = signal<Record<string, CrudFieldOption[]>>({});
  readonly loadingOptions = signal(false);
  readonly selectedTenantIdForFiltering = signal<string | null>(null);
  readonly filterValues = signal<Record<string, string>>({});
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly filteredItems = computed(() => {
    const activeFilters = this.filterValues();
    return this.items().filter((item) => {
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) {
          continue;
        }

        if (String(item[key] ?? '') !== value) {
          return false;
        }
      }

      return true;
    });
  });

  readonly form = this.fb.group({});
  private readonly optionLookupByField = new Map<string, Map<string, Record<string, unknown>>>();

  readonly canCreate = computed(() => this.config.allowCreate !== false);
  readonly canEdit = computed(() => this.config.allowEdit !== false);
  readonly canDelete = computed(() => this.config.allowDelete !== false);
  readonly hasRowActions = computed(() => this.filteredItems().some((item) => this.canEditItem(item) || this.canDeleteItem(item)));

  readonly isTenantsView = computed(() => this.config.endpoint === '/tenants');

  readonly createCardTitle = computed(() => {
    if (this.isTenantsView()) {
      return this.editingId() ? 'Editar Condominio' : 'Añadir Nuevo Condominio';
    }

    return this.editingId() ? 'Editar registro' : 'Nuevo registro';
  });

  readonly tableCardTitle = computed(() => (this.isTenantsView() ? 'Condominios Registrados' : 'Registros'));

  ngOnInit(): void {
    this.buildForm();
    this.form.valueChanges.subscribe(() => this.syncFormFilters());
    this.loadSelectOptions();

    if (this.config.endpoint === '/reservations') {
      this.refreshIntervalId = setInterval(() => {
        if (!this.editingId()) {
          this.loadItems();
        }
      }, 60_000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  loadItems(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const tenantId = this.selectedTenantIdForFiltering();
    const endpoint = tenantId ? `${this.config.endpoint}?tenantId=${tenantId}` : this.config.endpoint;

    this.api
      .get<Record<string, unknown[]>>(endpoint)
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
    if (!this.canCreate() && !this.editingId()) {
      return;
    }

    if (!this.canEdit() && this.editingId()) {
      return;
    }

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
        const tenantIdControl = this.form.get('tenantId');
        const selectedTenant = typeof tenantIdControl?.value === 'string' ? tenantIdControl.value : '';

        this.editingId.set(null);
        this.form.reset(this.emptyFormValues());

        if (selectedTenant) {
          this.selectedTenantIdForFiltering.set(selectedTenant);
          this.form.patchValue({ tenantId: selectedTenant });
          this.loadSelectOptions();
        } else {
          this.loadItems();
        }
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'No se pudo guardar el registro.');
      },
    });
  }

  startEdit(item: Record<string, unknown>): void {
    if (!this.canEditItem(item)) {
      return;
    }

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

    if (this.config.endpoint === '/residents') {
      const emailValue = this.form.get('email')?.value;
      if (typeof emailValue === 'string' && emailValue) {
        this.syncResidentRelationshipByRole(emailValue);
      }
    }
  }

  deleteItem(item: Record<string, unknown>): void {
    if (!this.canDeleteItem(item)) {
      return;
    }

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
    this.selectedTenantIdForFiltering.set(null);
    this.form.reset(this.emptyFormValues());
    this.loadItems();
  }

  trackById(_: number, item: Record<string, unknown>): string {
    return typeof item['_id'] === 'string' ? (item['_id'] as string) : crypto.randomUUID();
  }

  getFieldOptions(field: CrudField): CrudFieldOption[] {
    if (this.config.endpoint === '/residents' && field.key === 'relationship') {
      const baseOptions = field.options || [];
      const emailValue = this.form.get('email')?.value;
      if (typeof emailValue !== 'string' || !emailValue) {
        return baseOptions;
      }

      const selectedResidentUser = this.optionLookupByField.get('email')?.get(emailValue);
      const selectedRole = String(selectedResidentUser?.['role'] ?? '');

      if (selectedRole === 'familiar') {
        return baseOptions.filter((option) => option.value === 'familiar');
      }

      if (selectedRole === 'residente') {
        return baseOptions.filter((option) => option.value === 'propietario' || option.value === 'inquilino');
      }

      return baseOptions;
    }

    const dynamic = this.dynamicOptions()[field.key];
    if (dynamic) {
      return dynamic;
    }

    return field.options || [];
  }

  onSelectChange(field: CrudField, rawValue: string): void {
    if (this.config.endpoint === '/residents' && field.key === 'email') {
      this.syncResidentRelationshipByRole(rawValue);
    }

    if (!field.autoFill?.length) {
      return;
    }

    const optionsMap = this.optionLookupByField.get(field.key);
    const selected = optionsMap?.get(rawValue);
    if (!selected) {
      return;
    }

    const patch: Record<string, unknown> = {};
    for (const rule of field.autoFill) {
      patch[rule.targetKey] = selected[rule.sourceKey] ?? '';
    }

    this.form.patchValue(patch);
  }

  private syncResidentRelationshipByRole(emailValue: string): void {
    const selectedResidentUser = this.optionLookupByField.get('email')?.get(emailValue);
    const selectedRole = String(selectedResidentUser?.['role'] ?? '');
    const currentRelationship = String(this.form.get('relationship')?.value ?? '');

    if (selectedRole === 'familiar') {
      if (currentRelationship !== 'familiar') {
        this.form.patchValue({ relationship: 'familiar' });
      }
      return;
    }

    if (selectedRole === 'residente') {
      const allowed = currentRelationship === 'propietario' || currentRelationship === 'inquilino';
      if (!allowed) {
        this.form.patchValue({ relationship: 'propietario' });
      }
    }
  }

  onTenantIdChange(value: string): void {
    this.selectedTenantIdForFiltering.set(value || null);
    this.loadSelectOptions();
  }

  shouldDisplayAsDate(key: string): boolean {
    return ['createdAt', 'dueDate', 'paymentDate', 'start', 'end'].includes(key);
  }

  formatCell(item: Record<string, unknown>, key: string): string {
    const value = item[key];
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (this.config.endpoint === '/reservations' && key === 'status') {
      const currentStatus = String(item['currentStatus'] ?? '');
      if (currentStatus === 'finalizada' || currentStatus === 'cancelada') {
        return currentStatus;
      }

      const endValue = item['end'];
      if (typeof endValue === 'string') {
        const endDate = new Date(endValue);
        if (!Number.isNaN(endDate.getTime()) && endDate.getTime() <= Date.now()) {
          return 'finalizada';
        }
      }
    }

    const field = this.config.fields.find((candidate) => candidate.key === key);
    if (field?.type === 'select') {
      const directOptions = field.options || [];
      const dynamicOptions = this.dynamicOptions()[field.key] || [];
      const matchedOption = [...dynamicOptions, ...directOptions].find((option) => option.value === String(value));

      if (matchedOption) {
        return matchedOption.label;
      }
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

  canEditItem(item: Record<string, unknown>): boolean {
    if (!this.canEdit()) {
      return false;
    }

    return this.config.canEditItem ? this.config.canEditItem(item) : true;
  }

  canDeleteItem(item: Record<string, unknown>): boolean {
    if (!this.canDelete()) {
      return false;
    }

    return this.config.canDeleteItem ? this.config.canDeleteItem(item) : true;
  }

  private buildForm(): void {
    for (const field of this.config.fields) {
      const validators = field.required ? [Validators.required] : [];
      this.form.addControl(field.key, this.fb.control('', validators));
    }
    this.form.reset(this.emptyFormValues());
  }

  private syncFormFilters(): void {
    const nextFilters: Record<string, string> = {};

    for (const field of this.config.fields) {
      if (field.type !== 'select') {
        continue;
      }

      const value = this.form.get(field.key)?.value;
      if (typeof value === 'string' && value) {
        nextFilters[field.key] = value;
      }
    }

    this.filterValues.set(nextFilters);

    const tenantId = nextFilters['tenantId'] || '';
    if (tenantId !== (this.selectedTenantIdForFiltering() || '')) {
      this.selectedTenantIdForFiltering.set(tenantId || null);
      this.loadSelectOptions();
    }
  }

  private loadSelectOptions(): void {
    const fieldsWithSource = this.config.fields.filter((field) => field.type === 'select' && !!field.optionsSource);

    if (!fieldsWithSource.length) {
      this.loadItems();
      return;
    }

    const selectedTenantId = this.selectedTenantIdForFiltering();
    const requests = fieldsWithSource.map((field) => {
      const source = field.optionsSource!;
      const endpoint = selectedTenantId && source.dependsOnTenant
        ? `${source.endpoint}?tenantId=${selectedTenantId}`
        : source.endpoint;
      return this.api.get<Record<string, unknown[]>>(endpoint);
    });

    forkJoin(requests).subscribe({
      next: (responses) => {
        const optionsByField: Record<string, CrudFieldOption[]> = {};

        for (let index = 0; index < fieldsWithSource.length; index += 1) {
          const field = fieldsWithSource[index];
          const source = field.optionsSource!;
          const response = responses[index];
          const recordsRaw = response[source.listKey];
          const records = Array.isArray(recordsRaw) ? (recordsRaw as Record<string, unknown>[]) : [];
          const filteredRecords = source.filterBy
            ? records.filter((item) => source.filterBy!.values.includes(String(item[source.filterBy!.key] ?? '')))
            : records;

          const options: CrudFieldOption[] = [];
          const optionsMap = new Map<string, Record<string, unknown>>();

          for (const item of filteredRecords) {
            const value = item[source.valueKey];
            const label = item[source.labelKey];
            if (value === null || value === undefined || label === null || label === undefined) {
              continue;
            }

            const optionValue = String(value);
            const primaryLabel = String(label);
            const secondaryLabel = source.labelSecondaryKey ? item[source.labelSecondaryKey] : undefined;
            const optionLabel = secondaryLabel ? `${primaryLabel} (${String(secondaryLabel)})` : primaryLabel;

            options.push({ label: optionLabel, value: optionValue });
            optionsMap.set(optionValue, item);
          }

          optionsByField[field.key] = options;
          this.optionLookupByField.set(field.key, optionsMap);
        }

        this.dynamicOptions.set(optionsByField);
        this.loadingOptions.set(false);
        this.loadItems();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'No se pudieron cargar opciones del formulario.');
        this.loadingOptions.set(false);
        this.loadItems();
      },
    });
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
