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

  readonly role = computed(() => this.auth.role());
  readonly isSuperadmin = computed(() => this.role() === 'superadmin');

  readonly visibleCharges = computed(() => {
    const selectedUserId = this.paymentForm.get('userId')?.value;
    const selectedUnitId = this.paymentForm.get('unitId')?.value;

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

  readonly paymentForm = this.fb.group({
    tenantId: [''],
    unitId: [''],
    userId: ['', Validators.required],
    chargeId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: ['mxn'],
    provider: ['manual'],
  });

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadOptions();
    this.loadPayments();
  }

  onTenantChange(): void {
    this.paymentForm.patchValue({ unitId: '', userId: '', chargeId: '' });
    this.loadOptions();
    this.loadPayments();
  }

  onUserOrUnitChange(): void {
    this.paymentForm.patchValue({ chargeId: '' });
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

  registerManualPayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const { tenantId, userId, chargeId, amount, currency, provider } = this.paymentForm.getRawValue();

    this.api
      .post('/payments', {
        ...(this.isSuperadmin() && tenantId ? { tenantId } : {}),
        userId,
        chargeId,
        amount: Number(amount),
        currency,
        provider,
      })
      .subscribe({
        next: () => {
          this.message.set('Pago registrado correctamente.');
          this.error.set(null);
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

    const { tenantId, userId, chargeId, amount, currency } = this.paymentForm.getRawValue();

    this.api
      .post<StripeCheckoutResponse>('/payments/checkout-session', {
        ...(this.isSuperadmin() && tenantId ? { tenantId } : {}),
        userId,
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
}
