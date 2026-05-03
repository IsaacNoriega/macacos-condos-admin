import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./service', () => ({
  findAllPayments: vi.fn(),
  findPaymentsByTenant: vi.fn(),
  findPaymentById: vi.fn(),
  findPaymentByIdInTenant: vi.fn(),
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

vi.mock('../users/model', () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock('../residents/service', () => ({
  findUnitsByUserEmail: vi.fn(),
}));

vi.mock('../../config/azureBlob', () => ({
  uploadPaymentProofToAzure: vi.fn(),
  getPaymentProofSasUrl: vi.fn(),
  deletePaymentProofBlob: vi.fn(),
  resolveOwnedProofBlobName: vi.fn(),
}));

vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
  return { default: vi.fn(() => mockStripe) };
});

import {
  approvePaymentWithProof,
  createPayment,
  createStripeCheckoutSession,
  deletePayment,
  getAllPayments,
  getPaymentProof,
  rejectPaymentWithProof,
  updatePayment,
} from './controller';
import {
  createPaymentInTenant,
  deletePaymentInTenant,
  findPaymentById,
  findPaymentByIdInTenant,
  findPaymentsByTenant,
  updatePaymentInTenant,
} from './service';
import Charge from '../charges/model';
import User from '../users/model';
import * as residentsService from '../residents/service';
import { getPaymentProofSasUrl, resolveOwnedProofBlobName } from '../../config/azureBlob';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('payments controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllPayments', () => {
    it('returns payments scoped to tenant for admin role', async () => {
      vi.mocked(findPaymentsByTenant).mockResolvedValue([{ _id: 'p1', amount: 100 }] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin', id: 'admin-1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllPayments(req, res, next);

      expect(findPaymentsByTenant).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payments: [{ _id: 'p1', amount: 100 }],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('filters to own payments for residente role', async () => {
      vi.mocked(residentsService.findUnitsByUserEmail).mockResolvedValue([{ unitId: 'unit-1' }] as any);
      vi.mocked(findPaymentsByTenant).mockResolvedValue([
        { _id: 'p1', userId: 'user-1', unitId: 'unit-1' },
        { _id: 'p2', userId: 'user-2', unitId: 'unit-2' },
      ] as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'residente', id: 'user-1', email: 'user@test.com' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllPayments(req, res, next);

      const callArg = vi.mocked(res.json).mock.calls[0][0];
      expect(callArg.payments).toHaveLength(1);
      expect(callArg.payments[0]._id).toBe('p1');
    });

    it('returns all payments for superadmin without query tenantId', async () => {
      const { findAllPayments } = await import('./service');
      vi.mocked(findAllPayments).mockResolvedValue([{ _id: 'p1' }, { _id: 'p2' }] as any);

      const req = mockRequest({
        tenantId: undefined,
        user: { role: 'superadmin', id: 'sa-1' },
        query: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllPayments(req, res, next);

      expect(findAllPayments).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards error to next on service failure', async () => {
      vi.mocked(findPaymentsByTenant).mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ tenantId: 'tenant-1', user: { role: 'admin' }, query: {} } as any);
      const res = mockResponse();
      const next = mockNext();

      await getAllPayments(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createPayment', () => {
    it('creates a manual payment with proof in review state', async () => {
      const mockCharge = {
        toObject: () => ({ amount: 500, dueDate: new Date(Date.now() + 86400000), lateFeePerDay: 10 }),
        isPaid: false,
      };
      vi.mocked(Charge.findOne as any).mockResolvedValue(mockCharge);
      vi.mocked(resolveOwnedProofBlobName).mockReturnValue('proofs/tenant-1/user-1/file.pdf');
      vi.mocked(createPaymentInTenant).mockResolvedValue({ _id: 'p3', status: 'in_review' } as any);
      vi.mocked(Charge.updateOne as any).mockResolvedValue({});

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        body: {
          chargeId: 'charge-1',
          userId: 'user-1',
          currency: 'mxn',
          provider: 'manual',
          proofOfPaymentUrl: 'https://storage.blob.core.windows.net/proofs/tenant-1/user-1/file.pdf',
        },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(createPaymentInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when superadmin does not provide tenantId', async () => {
      const req = mockRequest({
        tenantId: undefined,
        user: { id: 'sa-1', role: 'superadmin' },
        body: { chargeId: 'charge-1', userId: 'user-1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when residente tries to register payment for another user', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        body: {
          chargeId: 'charge-1',
          userId: 'user-2', // different user
          provider: 'manual',
        },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next when charge is already paid', async () => {
      vi.mocked(Charge.findOne as any).mockResolvedValue({ isPaid: true });

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        body: { chargeId: 'charge-1', userId: 'user-1', provider: 'manual' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('getPaymentProof', () => {
    it('returns SAS URL for payment with blob name', async () => {
      vi.mocked(findPaymentByIdInTenant).mockResolvedValue({
        _id: 'p1',
        proofOfPaymentBlobName: 'proofs/tenant-1/user-1/file.pdf',
        proofOfPaymentUrl: 'https://...',
      } as any);
      vi.mocked(getPaymentProofSasUrl).mockResolvedValue('https://sas-url.example.com/file.pdf');

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin', id: 'admin-1' },
        params: { id: 'p1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getPaymentProof(req, res, next);

      expect(getPaymentProofSasUrl).toHaveBeenCalledWith('proofs/tenant-1/user-1/file.pdf');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        proofUrl: 'https://sas-url.example.com/file.pdf',
      });
    });

    it('calls next with 404 when payment not found', async () => {
      vi.mocked(findPaymentByIdInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'admin', id: 'admin-1' },
        params: { id: 'nonexistent' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getPaymentProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next 403 when residente tries to view another user proof', async () => {
      vi.mocked(findPaymentByIdInTenant).mockResolvedValue({
        _id: 'p1',
        userId: 'user-2',
        proofOfPaymentBlobName: 'blob',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { role: 'residente', id: 'user-1' },
        params: { id: 'p1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await getPaymentProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('updatePayment', () => {
    it('updates payment with allowed fields only', async () => {
      vi.mocked(updatePaymentInTenant).mockResolvedValue({ _id: 'p1', status: 'completed' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'p1' },
        body: { status: 'completed', proofOfPaymentUrl: 'hacked-url' }, // proofOfPaymentUrl should be stripped
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updatePayment(req, res, next);

      // Verify proofOfPaymentUrl is stripped from update
      const updateCall = vi.mocked(updatePaymentInTenant).mock.calls[0][2];
      expect(updateCall).not.toHaveProperty('proofOfPaymentUrl');
      expect(updateCall).toHaveProperty('status', 'completed');
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when payment not found', async () => {
      vi.mocked(updatePaymentInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
        body: { status: 'completed' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await updatePayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('deletePayment', () => {
    it('deletes payment and returns success message', async () => {
      vi.mocked(deletePaymentInTenant).mockResolvedValue({ _id: 'p1' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'p1' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deletePayment(req, res, next);

      expect(deletePaymentInTenant).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 404 when payment not found', async () => {
      vi.mocked(deletePaymentInTenant).mockResolvedValue(null as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'nonexistent' },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await deletePayment(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('approvePaymentWithProof', () => {
    it('approves in_review payment and marks charge as paid', async () => {
      vi.mocked(findPaymentByIdInTenant).mockResolvedValue({
        _id: 'p1',
        status: 'in_review',
        proofOfPaymentUrl: 'https://proof.url',
        tenantId: 'tenant-1',
        chargeId: 'charge-1',
      } as any);
      vi.mocked(updatePaymentInTenant).mockResolvedValue({ _id: 'p1', status: 'completed' } as any);
      vi.mocked(Charge.updateOne as any).mockResolvedValue({});

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'p1' },
        body: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await approvePaymentWithProof(req, res, next);

      expect(updatePaymentInTenant).toHaveBeenCalledWith(
        'p1',
        'tenant-1',
        expect.objectContaining({ status: 'completed' })
      );
      expect(Charge.updateOne).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 403 when called by residente role', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        params: { id: 'p1' },
        body: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await approvePaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next with 400 when payment is not in_review status', async () => {
      vi.mocked(findPaymentByIdInTenant).mockResolvedValue({
        _id: 'p1',
        status: 'paid',
        proofOfPaymentUrl: 'https://proof.url',
      } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'p1' },
        body: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await approvePaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('rejectPaymentWithProof', () => {
    it('rejects in_review payment and sets status to failed', async () => {
      vi.mocked(findPaymentByIdInTenant).mockResolvedValue({
        _id: 'p1',
        status: 'in_review',
        proofOfPaymentUrl: 'https://proof.url',
        tenantId: 'tenant-1',
      } as any);
      vi.mocked(updatePaymentInTenant).mockResolvedValue({ _id: 'p1', status: 'failed' } as any);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'admin-1', role: 'admin' },
        params: { id: 'p1' },
        body: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await rejectPaymentWithProof(req, res, next);

      expect(updatePaymentInTenant).toHaveBeenCalledWith(
        'p1',
        'tenant-1',
        expect.objectContaining({ status: 'failed' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next with 403 when called by familiar role', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'familiar' },
        params: { id: 'p1' },
        body: {},
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await rejectPaymentWithProof(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('createStripeCheckoutSession', () => {
    it('calls next with error when STRIPE_SECRET_KEY is not set', async () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const mockCharge = {
        toObject: () => ({ amount: 500, dueDate: new Date(Date.now() + 86400000) }),
        isPaid: false,
      };
      vi.mocked(Charge.findOne as any).mockResolvedValue(mockCharge);

      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        body: { userId: 'user-1', chargeId: 'charge-1', amount: 500 },
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createStripeCheckoutSession(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      process.env.STRIPE_SECRET_KEY = originalKey;
    });

    it('calls next when userId or chargeId is missing', async () => {
      const req = mockRequest({
        tenantId: 'tenant-1',
        user: { id: 'user-1', role: 'residente' },
        body: { amount: 500 }, // missing userId and chargeId
      } as any);
      const res = mockResponse();
      const next = mockNext();

      await createStripeCheckoutSession(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
