import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Payment, StripeCheckoutResponse } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';

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
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly paymentForm = this.fb.group({
    userId: ['', Validators.required],
    chargeId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: ['mxn'],
    provider: ['manual'],
  });

  constructor(
    private readonly api: ApiService
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .get<{ success: boolean; payments: Payment[] }>('/payments')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.payments.set(response.payments || []),
        error: (err) => this.error.set(err?.error?.message || 'No fue posible cargar pagos.'),
      });
  }

  registerManualPayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const { userId, chargeId, amount, currency, provider } = this.paymentForm.getRawValue();

    this.api
      .post('/payments', {
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

    const { userId, chargeId, amount, currency } = this.paymentForm.getRawValue();

    this.api
      .post<StripeCheckoutResponse>('/payments/checkout-session', {
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
