import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, finalize, forkJoin } from 'rxjs';
import { Payment, PaymentProofUploadResponse, StripeCheckoutResponse, Tenant, Unit, User as ApiUser, Charge as ApiCharge } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';
import { DrawerComponent } from '../../shared/drawer/drawer.component';
import { ToastService } from '../../../core/services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    CurrencyPipe,
    FancySelectComponent,
    MacIconComponent,
    DrawerComponent
  ],
  templateUrl: './payments.page.html',
  styleUrl: './payments.page.css',
})
export class PaymentsPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private refreshIntervalId: any;

  // Data signals
  payments = signal<Payment[]>([]);
  residentCharges = signal<PaymentCharge[]>([]);
  tenants = signal<Tenant[]>([]);
  units = signal<Unit[]>([]);
  users = signal<ApiUser[]>([]);
  chargeOptions = signal<SelectOption[]>([]);

  // UI State signals
  loading = signal(false);
  stripeConfirming = signal(false);
  loadingOptions = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  // Pattern Signals
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly view = signal<'grid' | 'list'>('grid');
  searchTerm = signal('');
  activeFilter = signal('all');
  editorOpen = signal(false);
  proofDrawerOpen = signal(false);
  selectedChargeId = signal<string | null>(null);

  paymentForm = this.fb.group({
    tenantId: [''],
    unitId: ['', Validators.required],
    userId: ['', Validators.required],
    chargeId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    currency: ['mxn', Validators.required],
  });

  readonly role = computed(() => this.auth.role() ?? 'admin');
  readonly isSuperadmin = computed(() => this.role() === 'superadmin');
  readonly isStaff = computed(() => ['admin', 'superadmin', 'staff'].includes(this.role()));
  readonly currentUserId = computed(() => this.auth.user()?._id);

  readonly tenantOptions = computed(() => this.tenants().map((t) => ({ label: t.name, value: t._id })));
  readonly unitOptions = computed(() => {
    const tid = this.paymentForm.get('tenantId')?.value;
    return this.units()
      .filter((u) => !tid || u.tenantId === tid)
      .map((u) => ({ label: u.code, value: u._id }));
  });
  readonly userOptions = computed(() => {
    const tid = this.paymentForm.get('tenantId')?.value;
    return this.users()
      .filter((u) => !tid || u.tenantId === tid)
      .map((u) => ({ label: u.name || u.email, value: u._id }));
  });

  filteredPayments = computed(() => {
    let list = this.payments();
    const search = this.searchTerm().toLowerCase();
    const filter = this.activeFilter();

    if (search) {
      list = list.filter(p => 
        this.getUserLabel(p.userId).toLowerCase().includes(search) ||
        this.getUnitLabel(p.unitId).toLowerCase().includes(search)
      );
    }

    if (filter !== 'all') {
      list = list.filter(p => p.status === filter);
    }

    return list;
  });

  pagedPayments = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredPayments().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredPayments().length / this.pageSize));

  // Filter options
  filters = [
    { label: 'Todo', value: 'all' },
    { label: 'Pagados', value: 'completed' },
    { label: 'En revisión', value: 'in_review' },
    { label: 'Fallidos', value: 'failed' }
  ];

  ngOnInit() {
    this.loadData();
    this.checkStripeResponse();
    this.refreshIntervalId = setInterval(() => this.loadPayments(), 30000);
  }

  ngOnDestroy() {
    if (this.refreshIntervalId) clearInterval(this.refreshIntervalId);
  }

  private checkStripeResponse() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    const stripeStatus = this.route.snapshot.queryParamMap.get('stripe');

    if (sessionId && stripeStatus === 'success') {
      this.confirmStripePayment(sessionId);
    } else if (stripeStatus === 'cancel') {
      this.toast.bad('Pago cancelado');
    }
  }

  private async confirmStripePayment(sessionId: string) {
    this.stripeConfirming.set(true);
    try {
      await firstValueFrom(this.api.post(`/payments/checkout-session/${sessionId}/confirm`, {}));
      this.toast.ok('¡Pago confirmado con éxito!');
      this.loadPayments();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { session_id: null, stripe: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    } catch (err: any) {
      this.toast.bad('Error al confirmar pago', err?.error?.message || 'Error desconocido');
    } finally {
      this.stripeConfirming.set(false);
    }
  }

  setSearch(val: string): void { this.searchTerm.set(val); this.page.set(1); }
  setFilter(val: any): void { this.activeFilter.set(val); this.page.set(1); }
  setView(view: 'grid' | 'list'): void { this.view.set(view); }

  openRegister() {
    this.paymentForm.reset({ currency: 'mxn', amount: 0 });
    this.editorOpen.set(true);
  }

  closeEditor() {
    this.editorOpen.set(false);
    this.selectedFile.set(null);
  }

  openProofDrawer(chargeId: string) {
    this.selectedChargeId.set(chargeId);
    this.selectedFile.set(null);
    this.proofDrawerOpen.set(true);
  }

  closeProofDrawer() {
    this.proofDrawerOpen.set(false);
    this.selectedChargeId.set(null);
  }


  loadData(): void {
    this.loading.set(true);
    
    if (this.isStaff()) {
      const requests: any = {
        units: this.api.get<{ units: Unit[] }>('/units'),
        users: this.api.get<{ users: ApiUser[] }>('/users'),
      };

      if (this.isSuperadmin()) {
        requests.tenants = this.api.get<{ tenants: Tenant[] }>('/tenants');
      }

      forkJoin(requests).subscribe({
        next: (res: any) => {
          if (this.isSuperadmin()) {
            this.tenants.set(res.tenants.tenants || []);
          }
          this.units.set(res.units.units || []);
          this.users.set(res.users.users || []);
          this.loadPayments();
        },
        error: () => {
          this.loading.set(false);
          this.toast.bad('Error cargando catálogos');
        },
      });
    } else {
      this.loadPayments();
    }
  }

  async loadPayments() {
    try {
      const res = await firstValueFrom(this.api.get<{ payments: Payment[] }>('/payments'));
      this.payments.set(res.payments || []);

      if (!this.isStaff()) {
        const chargesRes = await firstValueFrom(this.api.get<{ charges: ApiCharge[] }>('/charges'));
        const charges = chargesRes.charges || [];
        // Show charges specifically for the user OR charges for the unit without a specific user
        this.residentCharges.set(charges.filter((c) => !c.isPaid && (c.userId === this.currentUserId() || !c.userId)) as any);
      }
    } catch (err) {
      this.error.set('Error al cargar pagos');
    } finally {
      this.loading.set(false);
    }
  }

  async loadOptions() {
  }

  async onTenantChange() {
    const tid = this.paymentForm.get('tenantId')?.value;
    this.paymentForm.patchValue({ unitId: '', userId: '', chargeId: '' });
    if (!tid) return;

    try {
      const res = await firstValueFrom(this.api.get<{ units: Unit[] }>(`/units?tenantId=${tid}`));
      this.units.set(res.units || []);
    } catch (e) {
      console.error(e);
    }
  }

  async onUserOrUnitChange() {
    const usid = this.paymentForm.get('userId')?.value;
    const unid = this.paymentForm.get('unitId')?.value;

    if (usid || unid) {
      try {
        // Send both userId and unitId so the backend can return user-specific AND unit-wide charges
        const queryParams = [];
        if (usid) queryParams.push(`userId=${usid}`);
        if (unid) queryParams.push(`unitId=${unid}`);
        
        const res = await firstValueFrom(this.api.get<{ charges: ApiCharge[] }>(`/charges?${queryParams.join('&')}`));
        const pending = (res.charges || []).filter((c) => !c.isPaid);
        this.chargeOptions.set(pending.map((c) => ({ label: `${c.description} ($${c.amount})`, value: c._id })));
      } catch (e) {
        console.error(e);
      }
    }
  }

  onChargeSelected() {
    const cid = this.paymentForm.get('chargeId')?.value;
    if (!cid) return;

    this.api.get<{ charges: ApiCharge[] }>('/charges').subscribe((res) => {
      const c = (res.charges || []).find((x) => x._id === cid);
      if (c) {
        this.paymentForm.patchValue({ amount: this.getChargeTotalAmount(c as any) });
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.selectedFile.set(file);
  }

  async registerPaymentWithProof() {
    if (this.paymentForm.invalid) return;
    this.loading.set(true);
    this.message.set(null);

    const val = this.paymentForm.value;
    try {
      let proofUrl = '';
      if (this.selectedFile()) {
        const tid = val.tenantId || this.auth.user()?.tenantId || '';
        const upload: any = await firstValueFrom(this.api.postFormData<any>('/payments/proofs', this.createFormData(this.selectedFile()!, tid)));
        proofUrl = upload.proofOfPaymentUrl || upload.url;
      }

      await firstValueFrom(
        this.api.post('/payments', {
          tenantId: val.tenantId,
          userId: val.userId!,
          chargeId: val.chargeId!,
          amount: val.amount!,
          currency: val.currency!,
          provider: 'manual',
          proofOfPaymentUrl: proofUrl,
        })
      );

      this.message.set('Pago registrado correctamente');
      this.closeEditor();
      this.loadPayments();
    } catch (err: any) {
      this.error.set(err.error?.message || 'Error al registrar pago');
    } finally {
      this.loading.set(false);
    }
  }

  private createFormData(file: File, tenantId?: string): FormData {
    const formData = new FormData();
    formData.append('file', file);
    if (tenantId) formData.append('tenantId', tenantId);
    return formData;
  }


  async submitProofForSelectedCharge() {
    const cid = this.selectedChargeId();
    const file = this.selectedFile();
    if (!cid || !file) return;

    this.loading.set(true);
    try {
      const tid = this.auth.user()?.tenantId || '';
      const upload: any = await firstValueFrom(this.api.postFormData<any>('/payments/proofs', this.createFormData(file, tid)));
      await firstValueFrom(
        this.api.post('/payments', {
          tenantId: this.auth.user()?.tenantId,
          userId: this.currentUserId(),
          chargeId: cid,
          amount: 0,
          currency: 'mxn',
          provider: 'manual',
          proofOfPaymentUrl: upload.proofOfPaymentUrl || upload.url,
        })
      );
      this.toast.ok('Comprobante enviado a revisión');
      this.closeProofDrawer();
      this.loadPayments();
    } catch (err) {
      this.toast.bad('Error al subir comprobante');
    } finally {
      this.loading.set(false);
    }
  }
  async goToStripeCheckout() {
    const cid = this.paymentForm.get('chargeId')?.value;
    if (!cid) return;
    try {
      const payload = {
        tenantId: this.paymentForm.get('tenantId')?.value,
        userId: this.auth.user()?._id,
        chargeId: cid,
        amount: this.paymentForm.get('amount')?.value || 0,
        currency: 'mxn'
      };
      const res: any = await firstValueFrom(this.api.post<any>('/payments/checkout-session', payload));
      window.location.href = res.checkoutUrl || res.url;
    } catch (err) {
      this.error.set('Error al iniciar pago con Stripe');
    }
  }

  async payChargeWithStripe(charge: PaymentCharge) {
    try {
      const payload = {
        tenantId: this.auth.user()?.tenantId,
        userId: this.auth.user()?._id,
        chargeId: charge._id,
        amount: this.getChargeTotalAmount(charge),
        currency: 'mxn'
      };
      const res: any = await firstValueFrom(this.api.post<any>('/payments/checkout-session', payload));
      window.location.href = res.checkoutUrl || res.url;
    } catch (err) {
      this.error.set('Error al iniciar pago con Stripe');
    }
  }

  async approvePayment(id: string) {
    try {
      await firstValueFrom(this.api.post(`/payments/${id}/approve`, {}));
      this.loadPayments();
      this.toast.ok('Pago aprobado');
    } catch (e) {
      this.error.set('Error al aprobar');
    }
  }

  async rejectPayment(id: string) {
    try {
      await firstValueFrom(this.api.post(`/payments/${id}/reject`, {}));
      this.loadPayments();
      this.toast.ok('Pago rechazado');
    } catch (e) {
      this.error.set('Error al rechazar');
    }
  }

  openPaymentProof(payment: Payment) {
    if (payment.proofOfPaymentUrl) window.open(payment.proofOfPaymentUrl, '_blank');
  }

  // Helpers
  getUserLabel(userId: any) {
    if (userId && typeof userId === 'object' && userId.name) {
      return userId.name;
    }
    const id = typeof userId === 'object' ? userId?._id : userId;
    const user = this.users().find(u => u._id === id);
    return user?.name || user?.email || 'Usuario';
  }
  getUnitLabel(id?: string) {
    const unit = this.units().find(u => u._id === id);
    return unit?.code || id || '—';
  }
  getChargeLabel(id: string) {
    return 'Mensualidad';
  }
  getStatusLabel(s: string) {
    const map: any = { completed: 'Pagado', paid: 'Pagado', pending: 'Pendiente', in_review: 'En revisión', failed: 'Fallido' };
    return map[s] || s;
  }
  getStatusColor(s: string) {
    const map: any = { completed: 'ok', paid: 'ok', pending: 'warn', in_review: 'info', failed: 'error' };
    return map[s] || 'info';
  }

  getChargeLateFeeAmount(c: PaymentCharge) {
    if (!c.dueDate || !c.lateFeePerDay) return 0;
    const due = new Date(c.dueDate);
    const now = new Date();
    if (now <= due) return 0;
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 3600 * 24));
    return diff * c.lateFeePerDay;
  }

  getChargeTotalAmount(c: PaymentCharge) {
    return c.amount + this.getChargeLateFeeAmount(c);
  }
}
