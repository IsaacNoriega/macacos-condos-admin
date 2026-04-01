import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Payment, StripeCheckoutResponse } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

interface SelectOption {
  label: string;
  value: string;
}

interface PaymentCharge {
  _id: string;
  userId: string;
  unitId?: string;
  description: string;
  amount: number;
  dueDate?: string;
  lateFeePerDay?: number;
  isPaid?: boolean;
}

@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, CurrencyPipe],
  templateUrl: './payments.page.html',
  styleUrl: './payments.page.css',
})
export class PaymentsPage implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly payments = signal<Payment[]>([]);
  readonly tenants = signal<SelectOption[]>([]);
  readonly users = signal<SelectOption[]>([]);
  readonly units = signal<SelectOption[]>([]);
  readonly charges = signal<PaymentCharge[]>([]);
  readonly loading = signal(false);
  readonly loadingOptions = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly selectedChargeForProof = signal<string | null>(null);
  readonly uploadingProof = signal(false);

  readonly role = computed(() => this.auth.role());
  readonly isSuperadmin = computed(() => this.role() === 'superadmin');
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isResidente = computed(() => this.role() === 'residente' || this.role() === 'familiar');
  readonly isStaff = computed(() => this.isSuperadmin() || this.isAdmin());
  readonly userId = computed(() => this.auth.user()?._id);

  readonly visibleCharges = computed(() => {
    const selectedUserId = this.paymentForm.get('userId')?.value;
    const selectedUnitId = this.paymentForm.get('unitId')?.value;

    // Si no hay filtros seleccionados, mostrar todos los cargos
    if (!selectedUserId && !selectedUnitId) {
      return this.charges();
    }

    return this.charges().filter((charge) => {
      if (selectedUserId && charge.userId !== selectedUserId) {
        return false;
      }
      if (selectedUnitId && charge.unitId && charge.unitId !== selectedUnitId) {
        return false;
      }
      return true;
    });
  });

  readonly residentCharges = computed(() => {
    const currentUserId = this.userId();
    if (!currentUserId) {
      return [] as PaymentCharge[];
    }

    const paidChargeIds = new Set(
      this.payments()
        .filter((payment) => payment.status === 'paid' || payment.status === 'completed')
        .map((payment) => String(payment.chargeId))
    );

    return this.charges().filter((charge) => {
      if (String(charge.userId) !== String(currentUserId)) {
        return false;
      }
      if (charge.isPaid) {
        return false;
      }
      return !paidChargeIds.has(String(charge._id));
    });
  });

  readonly visiblePayments = computed(() => {
    const allPayments = this.payments();

    if (this.isResidente()) {
      const currentUserId = this.userId();
      return allPayments.filter((payment) => String(payment.userId) === String(currentUserId));
    }

    const selectedUserId = this.paymentForm.get('userId')?.value;
    const selectedUnitId = this.paymentForm.get('unitId')?.value;

    return allPayments.filter((payment) => {
      if (selectedUserId && String(payment.userId) !== String(selectedUserId)) {
        return false;
      }
      if (selectedUnitId && payment.unitId && String(payment.unitId) !== String(selectedUnitId)) {
        return false;
      }
      return true;
    });
  });

  readonly paymentForm = this.fb.group({
    tenantId: [''],
    unitId: [''],
    userId: [''],
    chargeId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: ['mxn'],
    provider: ['stripe'],
  });

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.isResidente()) {
      this.paymentForm.patchValue({ userId: this.userId() });
    }
    
    this.loadOptions();
    this.loadPayments();
  }

  onTenantChange(): void {
    this.paymentForm.patchValue({ unitId: '', userId: this.isResidente() ? this.userId() : '', chargeId: '' });
    this.loadOptions();
    this.loadPayments();
  }

  onUserOrUnitChange(): void {
    this.paymentForm.patchValue({ chargeId: '' });
  }

  onChargeSelected(): void {
    const chargeId = this.paymentForm.get('chargeId')?.value;
    const selectedCharge = this.charges().find((charge) => String(charge._id) === String(chargeId));
    if (selectedCharge) {
      this.paymentForm.patchValue({ amount: this.getChargeTotalAmount(selectedCharge) });
    }
  }

  loadPayments(): void {
    this.loading.set(true);
    this.error.set(null);

    const tenantId = this.paymentForm.get('tenantId')?.value;
    const endpoint = this.isSuperadmin() && tenantId ? `/payments?tenantId=${tenantId}` : '/payments';

    this.api
      .get<{ success: boolean; payments: Payment[] }>(endpoint)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.payments.set(response.payments || []),
        error: (err) => this.error.set(err?.error?.message || 'No fue posible cargar pagos.'),
      });
  }

  private loadOptions(): void {
    this.loadingOptions.set(true);

    const tenantId = this.paymentForm.get('tenantId')?.value;
    const tenantQuery = this.isSuperadmin() && tenantId ? `?tenantId=${tenantId}` : '';

    if (this.isSuperadmin()) {
      this.api.get<{ success: boolean; tenants: Array<{ _id: string; name: string; contactEmail?: string }> }>('/tenants').subscribe({
        next: (response) => {
          this.tenants.set(
            (response.tenants || []).map((tenant) => ({
              value: tenant._id,
              label: tenant.contactEmail ? `${tenant.name} (${tenant.contactEmail})` : tenant.name,
            }))
          );
        },
      });
    }

    this.api.get<{ success: boolean; units: Array<{ _id: string; code: string }> }>(`/units${tenantQuery}`).subscribe({
      next: (response) => {
        this.units.set((response.units || []).map((unit) => ({ value: unit._id, label: unit.code })));
      },
    });

    this.api
      .get<{ success: boolean; users: Array<{ _id: string; name: string; email: string }> }>(`/users${tenantQuery}`)
      .subscribe({
        next: (response) => {
          this.users.set(
            (response.users || []).map((user) => ({
              value: user._id,
              label: `${user.name} (${user.email})`,
            }))
          );
        },
      });

    this.api
      .get<{ success: boolean; charges: PaymentCharge[] }>(`/charges${tenantQuery}`)
      .pipe(finalize(() => this.loadingOptions.set(false)))
      .subscribe({
        next: (response) => {
          this.charges.set(response.charges || []);
        },
        error: () => {
          this.loadingOptions.set(false);
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.selectedFile.set(input.files[0]);
    }
  }

  selectChargeForProof(chargeId: string): void {
    this.selectedChargeForProof.set(chargeId);
    this.selectedFile.set(null);
  }

  payChargeWithStripe(charge: PaymentCharge): void {
    const tenantId = this.paymentForm.get('tenantId')?.value;

    this.api
      .post<StripeCheckoutResponse>('/payments/checkout-session', {
        ...(this.isSuperadmin() && tenantId ? { tenantId } : {}),
        userId: this.userId(),
        unitId: charge.unitId,
        chargeId: charge._id,
        amount: Number(charge.amount),
        currency: 'mxn',
      })
      .subscribe({
        next: (response) => {
          this.message.set('Checkout de Stripe creado. Redirigiendo...');
          this.error.set(null);
          if (response.checkoutUrl) {
            window.location.href = response.checkoutUrl;
          }
        },
        error: (err) => this.error.set(err?.error?.message || 'No fue posible iniciar Stripe Checkout.'),
      });
  }

  submitProofForSelectedCharge(): void {
    const chargeId = this.selectedChargeForProof();
    const charge = this.residentCharges().find((item) => String(item._id) === String(chargeId));

    if (!charge) {
      this.error.set('Selecciona un cargo válido para subir comprobante.');
      return;
    }

    if (!this.selectedFile()) {
      this.error.set('Debes seleccionar un comprobante de pago.');
      return;
    }

    const proofUrl = URL.createObjectURL(this.selectedFile()!);

    this.api
      .post('/payments', {
        userId: this.userId(),
        unitId: charge.unitId,
        chargeId: charge._id,
        amount: Number(charge.amount),
        currency: 'mxn',
        provider: 'manual',
        proofOfPaymentUrl: proofUrl,
      })
      .subscribe({
        next: () => {
          this.message.set('Comprobante enviado. Tu pago quedó en revisión.');
          this.error.set(null);
          this.selectedFile.set(null);
          this.selectedChargeForProof.set(null);
          this.loadPayments();
        },
        error: (err) => this.error.set(err?.error?.message || 'No fue posible enviar el comprobante.'),
      });
  }

  registerPaymentWithProof(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    if (!this.selectedFile()) {
      this.error.set('Debes seleccionar un comprobante de pago.');
      return;
    }

    const { tenantId, userId, unitId, chargeId, amount, currency } = this.paymentForm.getRawValue();

    if (!userId || !chargeId || !amount) {
      this.error.set('Debes rellenar todos los campos requeridos.');
      return;
    }

    const proofUrl = URL.createObjectURL(this.selectedFile()!);

    this.api
      .post('/payments', {
        ...(this.isSuperadmin() && tenantId ? { tenantId } : {}),
        userId,
        unitId,
        chargeId,
        amount: Number(amount),
        currency,
        provider: 'manual',
        proofOfPaymentUrl: proofUrl,
      })
      .subscribe({
        next: () => {
          this.message.set('Pago registrado pendiente de revisión.');
          this.error.set(null);
          this.selectedFile.set(null);
          this.paymentForm.reset({ provider: 'stripe' });
          this.loadPayments();
        },
        error: (err) => this.error.set(err?.error?.message || 'No fue posible registrar el pago.'),
      });
  }

  goToStripeCheckout(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const { tenantId, userId, unitId, chargeId, amount, currency } = this.paymentForm.getRawValue();

    if (!userId || !chargeId || !amount) {
      this.error.set('Debes seleccionar usuario, cargo y monto.');
      return;
    }

    this.api
      .post<StripeCheckoutResponse>('/payments/checkout-session', {
        ...(this.isSuperadmin() && tenantId ? { tenantId } : {}),
        userId,
        unitId,
        chargeId,
        amount: Number(amount),
        currency,
      })
      .subscribe({
        next: (response) => {
          this.message.set('Checkout de Stripe creado. Redirigiendo...');
          this.error.set(null);
          if (response.checkoutUrl) {
            window.location.href = response.checkoutUrl;
          }
        },
        error: (err) => this.error.set(err?.error?.message || 'No fue posible iniciar Stripe Checkout.'),
      });
  }

  approvePayment(paymentId: string): void {
    this.api.post(`/payments/${paymentId}/approve`, {}).subscribe({
      next: () => {
        this.message.set('Pago aprobado correctamente.');
        this.error.set(null);
        this.loadPayments();
      },
      error: (err) => this.error.set(err?.error?.message || 'No fue posible aprobar el pago.'),
    });
  }

  rejectPayment(paymentId: string): void {
    this.api.post(`/payments/${paymentId}/reject`, {}).subscribe({
      next: () => {
        this.message.set('Pago rechazado.');
        this.error.set(null);
        this.loadPayments();
      },
      error: (err) => this.error.set(err?.error?.message || 'No fue posible rechazar el pago.'),
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pendiente',
      in_review: 'En revisión',
      completed: 'Completado',
      failed: 'Rechazado',
      paid: 'Pagado',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: 'pending',
      in_review: 'in-review',
      completed: 'completed',
      failed: 'failed',
      paid: 'paid',
    };
    return colors[status] || 'pending';
  }

  getUserLabel(userId: string): string {
    const user = this.users().find((item) => String(item.value) === String(userId));
    return user?.label || userId;
  }

  getChargeLabel(chargeId: string): string {
    const charge = this.charges().find((item) => String(item._id) === String(chargeId));
    if (!charge) {
      return chargeId;
    }
    const totalAmount = this.getChargeTotalAmount(charge);
    return `${charge.description} (${totalAmount.toFixed(2)} MXN)`;
  }

  getUnitLabel(unitId?: string): string {
    if (!unitId) {
      return '-';
    }

    const unit = this.units().find((item) => String(item.value) === String(unitId));
    return unit?.label || unitId;
  }

  getChargeDaysOverdue(charge: PaymentCharge): number {
    if (!charge.dueDate) {
      return 0;
    }

    const dueDate = new Date(charge.dueDate);
    const now = new Date();
    if (Number.isNaN(dueDate.getTime()) || now.getTime() <= dueDate.getTime()) {
      return 0;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.ceil((now.getTime() - dueDate.getTime()) / dayMs));
  }

  getChargeLateFeeAmount(charge: PaymentCharge): number {
    const daysOverdue = this.getChargeDaysOverdue(charge);
    const lateFeePerDay = Number(charge.lateFeePerDay ?? 10);
    return Math.max(0, daysOverdue * lateFeePerDay);
  }

  getChargeTotalAmount(charge: PaymentCharge): number {
    return Number(charge.amount) + this.getChargeLateFeeAmount(charge);
  }
}
