import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentsPage } from './payments.page';

describe('PaymentsPage operations', () => {
  const apiMock = {
    get: vi.fn(),
    post: vi.fn(),
    postFormData: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const authMock = {
    role: vi.fn(),
    user: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.role.mockReturnValue('admin');
    authMock.user.mockReturnValue({ _id: 'u-admin', tenantId: 'tenant-1', role: 'admin' });

    apiMock.get.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/payments')) {
        return of({ success: true, payments: [] });
      }
      if (endpoint.startsWith('/units')) {
        return of({ success: true, units: [] });
      }
      if (endpoint.startsWith('/users')) {
        return of({ success: true, users: [] });
      }
      if (endpoint.startsWith('/charges')) {
        return of({ success: true, charges: [] });
      }
      if (endpoint.startsWith('/tenants')) {
        return of({ success: true, tenants: [] });
      }
      return of({ success: true });
    });

    apiMock.post.mockReturnValue(of({ success: true, checkoutUrl: '' }));
    apiMock.postFormData.mockReturnValue(
      of({ success: true, proofOfPaymentUrl: 'x', blobName: 'b' }),
    );

    TestBed.configureTestingModule({
      imports: [PaymentsPage],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
  });

  it('loads payments on init (mostrar)', () => {
    const fixture = TestBed.createComponent(PaymentsPage);
    const component = fixture.componentInstance;

    component.ngOnInit();

    expect(apiMock.get).toHaveBeenCalledWith('/payments');
  });

  it('loads payments with tenant filter for superadmin', () => {
    authMock.role.mockReturnValue('superadmin');
    authMock.user.mockReturnValue({ _id: 'u-super', tenantId: 'tenant-1', role: 'superadmin' });

    const fixture = TestBed.createComponent(PaymentsPage);
    const component = fixture.componentInstance;
    component.paymentForm.patchValue({ tenantId: 'tenant-2' });

    component.loadPayments();

    expect(apiMock.get).toHaveBeenCalledWith('/payments?tenantId=tenant-2');
  });

  it('creates stripe checkout request', () => {
    const fixture = TestBed.createComponent(PaymentsPage);
    const component = fixture.componentInstance;

    component.paymentForm.patchValue({
      userId: 'user-1',
      unitId: 'unit-1',
      chargeId: 'charge-1',
      amount: 999,
      currency: 'mxn',
    });

    component.goToStripeCheckout();

    expect(apiMock.post).toHaveBeenCalledWith('/payments/checkout-session', {
      userId: 'user-1',
      unitId: 'unit-1',
      chargeId: 'charge-1',
      amount: 999,
      currency: 'mxn',
    });
  });

  it('approves and rejects payment', () => {
    const fixture = TestBed.createComponent(PaymentsPage);
    const component = fixture.componentInstance;

    component.approvePayment('payment-1');
    component.rejectPayment('payment-2');

    expect(apiMock.post).toHaveBeenCalledWith('/payments/payment-1/approve', {});
    expect(apiMock.post).toHaveBeenCalledWith('/payments/payment-2/reject', {});
  });

  it('registers manual payment with proof', async () => {
    const fixture = TestBed.createComponent(PaymentsPage);
    const component = fixture.componentInstance;

    component.paymentForm.patchValue({
      userId: 'user-1',
      unitId: 'unit-1',
      chargeId: 'charge-1',
      amount: 700,
      currency: 'mxn',
    });
    component.selectedFile.set(new File(['proof'], 'proof.png', { type: 'image/png' }));

    await component.registerPaymentWithProof();

    expect(apiMock.postFormData).toHaveBeenCalled();
    expect(apiMock.post).toHaveBeenCalledWith('/payments', {
      userId: 'user-1',
      unitId: 'unit-1',
      chargeId: 'charge-1',
      amount: 700,
      currency: 'mxn',
      provider: 'manual',
      proofOfPaymentUrl: 'x',
      proofOfPaymentBlobName: 'b',
    });
  });

  it('shows error when trying to register manual payment without proof file', async () => {
    const fixture = TestBed.createComponent(PaymentsPage);
    const component = fixture.componentInstance;

    component.paymentForm.patchValue({
      userId: 'user-1',
      chargeId: 'charge-1',
      amount: 300,
      currency: 'mxn',
    });

    await component.registerPaymentWithProof();

    expect(component.error()).toContain('comprobante');
  });

  it('submits proof for selected charge in resident mode', async () => {
    authMock.role.mockReturnValue('residente');
    authMock.user.mockReturnValue({ _id: 'resident-1', tenantId: 'tenant-1', role: 'residente' });

    const fixture = TestBed.createComponent(PaymentsPage);
    const component = fixture.componentInstance;

    component.charges.set([
      {
        _id: 'charge-10',
        userId: 'resident-1',
        description: 'Cuota abril',
        amount: 550,
      },
    ] as any);
    component.payments.set([]);
    component.selectedChargeForProof.set('charge-10');
    component.selectedFile.set(new File(['proof'], 'proof.jpg', { type: 'image/jpeg' }));

    await component.submitProofForSelectedCharge();

    expect(apiMock.postFormData).toHaveBeenCalled();
    expect(apiMock.post).toHaveBeenCalledWith('/payments', {
      userId: 'resident-1',
      unitId: undefined,
      chargeId: 'charge-10',
      amount: 550,
      currency: 'mxn',
      provider: 'manual',
      proofOfPaymentUrl: 'x',
      proofOfPaymentBlobName: 'b',
    });
  });
});
