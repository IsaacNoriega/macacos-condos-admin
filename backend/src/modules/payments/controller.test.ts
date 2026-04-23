import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn() },
}));

vi.mock('./service', () => ({
  findAllPayments: vi.fn(),
  findPaymentsByTenant: vi.fn(),
  findPaymentById: vi.fn(),
  createPaymentInTenant: vi.fn(),
  updatePaymentInTenant: vi.fn(),
  deletePaymentInTenant: vi.fn(),
  upsertPaymentByStripeSessionId: vi.fn(),
}));

vi.mock('../charges/model', () => ({
  default: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../config/azureBlob', () => ({
  extractBlobNameFromProofUrl: vi.fn().mockReturnValue(null),
  getPaymentProofSasUrl: vi.fn(),
  uploadPaymentProofToAzure: vi.fn(),
}));

import {
  approvePaymentWithProof,
  createPayment,
  deletePayment,
  getAllPayments,
  rejectPaymentWithProof,
  updatePayment,
} from './controller';
import * as paymentsService from './service';
import ChargeModel from '../charges/model';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

// ─── helper ──────────────────────────────────────────────────────────────────

const makeCharge = (overrides = {}) => ({
  _id: 'c1',
  isPaid: false,
  amount: 1200,
  dueDate: new Date(Date.now() + 86400000), // mañana → sin mora
  lateFeePerDay: 0,
  tenantId: 'tenant-1',
  toObject: function () { return { ...this }; },
  ...overrides,
});

describe('payments controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  });

  // ─── getAllPayments ───────────────────────────────────────────────────────────

  describe('getAllPayments', () => {
    it('returns tenant payments for admin role', async () => {
      vi.mocked(paymentsService.findPaymentsByTenant).mockResolvedValue([{ _id: 'p1', amount: 1200 }] as any);

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllPayments(req, res, next);

      expect(paymentsService.findPaymentsByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({ success: true, payments: [{ _id: 'p1', amount: 1200 }] });
    });

    it('returns all payments for superadmin without queryTenantId', async () => {
      vi.mocked(paymentsService.findAllPayments).mockResolvedValue([]);

      const req = mockRequest({ user: { role: 'superadmin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllPayments(req, res, next);

      expect(paymentsService.findAllPayments).toHaveBeenCalled();
    });

    it('filters by queryTenantId for superadmin', async () => {
      vi.mocked(paymentsService.findPaymentsByTenant).mockResolvedValue([]);

      const req = mockRequest({ user: { role: 'superadmin' }, query: { tenantId: 'tenant-2' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllPayments(req, res, next);

      expect(paymentsService.findPaymentsByTenant).toHaveBeenCalledWith('tenant-2');
    });
  });

  // ─── createPayment ───────────────────────────────────────────────────────────

  describe('createPayment', () => {
    it('calls next when tenantId is missing', async () => {
      const req = mockRequest({ user: { role: 'admin' }, body: { chargeId: 'c1' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when admin does not provide unitId', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { chargeId: 'c1', userId: 'u1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when residente tries to pay for another user', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        body: { chargeId: 'c1', userId: 'other-user', unitId: 'u1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when charge is not found', async () => {
      vi.mocked(ChargeModel.findOne).mockResolvedValue(null);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { chargeId: 'bad-charge', unitId: 'u1', userId: 'u1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when charge is already paid', async () => {
      vi.mocked(ChargeModel.findOne).mockResolvedValue(makeCharge({ isPaid: true }) as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin' },
        body: { chargeId: 'c1', unitId: 'u1', userId: 'u1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('creates manual payment with status pending when no proofUrl', async () => {
      vi.mocked(ChargeModel.findOne).mockResolvedValue(makeCharge() as any);
      vi.mocked(paymentsService.createPaymentInTenant).mockResolvedValue({
        _id: 'p1',
        status: 'pending',
        provider: 'manual',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { chargeId: 'c1', unitId: 'u1', userId: 'u1', provider: 'manual' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(paymentsService.createPaymentInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('creates payment in_review when proofUrl is provided', async () => {
      vi.mocked(ChargeModel.findOne).mockResolvedValue(makeCharge() as any);
      vi.mocked(paymentsService.createPaymentInTenant).mockResolvedValue({
        _id: 'p1',
        status: 'in_review',
        provider: 'manual',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { chargeId: 'c1', unitId: 'u1', userId: 'u1', provider: 'manual', proofOfPaymentUrl: 'http://proof.url' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(paymentsService.createPaymentInTenant).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_review' }),
        'tenant-1'
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('marks charge as paid when payment is status paid', async () => {
      vi.mocked(ChargeModel.findOne).mockResolvedValue(makeCharge() as any);
      vi.mocked(ChargeModel.updateOne).mockResolvedValue({} as any);
      vi.mocked(paymentsService.createPaymentInTenant).mockResolvedValue({
        _id: 'p1',
        status: 'paid',
        provider: 'stripe',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        body: { chargeId: 'c1', unitId: 'u1', userId: 'u1', provider: 'stripe' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(ChargeModel.updateOne).toHaveBeenCalledWith(
        { _id: 'c1', tenantId: 'tenant-1' },
        { isPaid: true }
      );
    });

    it('residente can pay their own charge', async () => {
      vi.mocked(ChargeModel.findOne).mockResolvedValue(makeCharge() as any);
      vi.mocked(paymentsService.createPaymentInTenant).mockResolvedValue({
        _id: 'p1',
        status: 'pending',
        provider: 'manual',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        body: { chargeId: 'c1', userId: 'user-1', provider: 'manual' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(paymentsService.createPaymentInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ─── updatePayment ───────────────────────────────────────────────────────────

  describe('updatePayment', () => {
    it('updates payment and returns result', async () => {
      vi.mocked(paymentsService.updatePaymentInTenant).mockResolvedValue({ _id: 'p1', status: 'completed' } as any);

      const req = mockRequest({ params: { id: 'p1' }, tenantId: 'tenant-1', user: { role: 'admin' }, body: { status: 'completed' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await updatePayment(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, payment: { _id: 'p1', status: 'completed' } });
    });

    it('calls next with 404 when payment not found', async () => {
      vi.mocked(paymentsService.updatePaymentInTenant).mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'ghost' }, tenantId: 'tenant-1', user: { role: 'admin' }, body: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await updatePayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── deletePayment ───────────────────────────────────────────────────────────

  describe('deletePayment', () => {
    it('deletes payment and returns success message', async () => {
      vi.mocked(paymentsService.deletePaymentInTenant).mockResolvedValue({ _id: 'p1' } as any);

      const req = mockRequest({ params: { id: 'p1' }, tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await deletePayment(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Pago eliminado' });
    });

    it('calls next with 404 when payment not found', async () => {
      vi.mocked(paymentsService.deletePaymentInTenant).mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'ghost' }, tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await deletePayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  // ─── approvePaymentWithProof ─────────────────────────────────────────────────

  describe('approvePaymentWithProof', () => {
    it('returns 403 when role is not admin', async () => {
      const req = mockRequest({ params: { id: 'p1' }, user: { role: 'residente' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await approvePaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 404 when payment not found', async () => {
      vi.mocked(paymentsService.findPaymentById).mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'ghost' }, tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await approvePaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when payment is not in_review', async () => {
      vi.mocked(paymentsService.findPaymentById).mockResolvedValue({ _id: 'p1', status: 'paid', proofOfPaymentUrl: 'http://x.com', tenantId: 'tenant-1', chargeId: 'c1' } as any);

      const req = mockRequest({ params: { id: 'p1' }, tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await approvePaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when no proof url', async () => {
      vi.mocked(paymentsService.findPaymentById).mockResolvedValue({ _id: 'p1', status: 'in_review', tenantId: 'tenant-1', chargeId: 'c1' } as any);

      const req = mockRequest({ params: { id: 'p1' }, tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await approvePaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('approves payment successfully', async () => {
      vi.mocked(paymentsService.findPaymentById).mockResolvedValue({ _id: 'p1', status: 'in_review', proofOfPaymentUrl: 'http://x.com', tenantId: 'tenant-1', chargeId: 'c1' } as any);
      vi.mocked(paymentsService.updatePaymentInTenant).mockResolvedValue({ _id: 'p1', status: 'completed' } as any);
      vi.mocked(ChargeModel.updateOne).mockResolvedValue({} as any);

      const req = mockRequest({ params: { id: 'p1' }, tenantId: 'tenant-1', user: { id: 'admin-1', role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await approvePaymentWithProof(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Pago aprobado' }));
    });
  });

  // ─── rejectPaymentWithProof ──────────────────────────────────────────────────

  describe('rejectPaymentWithProof', () => {
    it('returns 403 when role is not admin', async () => {
      const req = mockRequest({ params: { id: 'p1' }, user: { role: 'residente' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await rejectPaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when payment is not in_review', async () => {
      vi.mocked(paymentsService.findPaymentById).mockResolvedValue({ _id: 'p1', status: 'paid', tenantId: 'tenant-1' } as any);

      const req = mockRequest({ params: { id: 'p1' }, tenantId: 'tenant-1', user: { role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await rejectPaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('rejects payment successfully', async () => {
      vi.mocked(paymentsService.findPaymentById).mockResolvedValue({ _id: 'p1', status: 'in_review', tenantId: 'tenant-1', chargeId: 'c1' } as any);
      vi.mocked(paymentsService.updatePaymentInTenant).mockResolvedValue({ _id: 'p1', status: 'failed' } as any);

      const req = mockRequest({ params: { id: 'p1' }, tenantId: 'tenant-1', user: { id: 'admin-1', role: 'admin' } } as any);
      const res = mockResponse();
      const next = mockNext();

      await rejectPaymentWithProof(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Pago rechazado' }));
    });
  });
});
