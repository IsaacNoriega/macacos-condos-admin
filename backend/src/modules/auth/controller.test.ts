import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// 1. Mocks at the top level
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../users/service', () => ({
  createUserInTenant: vi.fn(),
  findUserByEmailInTenant: vi.fn(),
  findUsersByEmail: vi.fn(),
  updateUserPasswordByResetToken: vi.fn(),
}));

vi.mock('../tenants/service', () => ({
  findTenantById: vi.fn(),
  findTenantByIdentifier: vi.fn(),
}));

vi.mock('../../utils/notifications', () => ({
  sendResetPasswordEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// 2. Imports after mocks
import { login, forgotPassword, resetPassword } from './controller';
import { findUserByEmailInTenant, updateUserPasswordByResetToken } from '../users/service';
import { findTenantById, findTenantByIdentifier } from '../tenants/service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('auth controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'secret';
  });

  describe('login', () => {
    it('successfully logs in with tenant identifier', async () => {
      const user = {
        _id: 'u1',
        tenantId: 't1',
        email: 'test@test.com',
        password: 'hashed_password',
        role: 'admin',
        toObject: () => ({ _id: 'u1', email: 'test@test.com', role: 'admin' })
      } as any;

      vi.mocked(findTenantByIdentifier).mockResolvedValue({ _id: 't1', identifier: 'mac-1' } as any);
      vi.mocked(findUserByEmailInTenant).mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      
      const req = mockRequest({ 
        body: { 
          email: 'test@test.com', 
          password: 'password123', 
          tenantIdentifier: 'mac-1' 
        } 
      });
      const res = mockResponse();
      const next = mockNext();

      await login(req, res, next);

      expect(findTenantByIdentifier).toHaveBeenCalledWith('mac-1');
      expect(findUserByEmailInTenant).toHaveBeenCalledWith('test@test.com', 't1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: expect.any(String) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('returns error if tenant not found', async () => {
      vi.mocked(findTenantByIdentifier).mockResolvedValue(null);
      
      const req = mockRequest({ body: { email: 'x@x.com', password: 'p', tenantIdentifier: 'bad' } });
      const res = mockResponse();
      const next = mockNext();

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('forgotPassword', () => {
    it('generates reset token and sends email', async () => {
      const save = vi.fn().mockResolvedValue(true);
      const user = {
        _id: 'user-1',
        tenantId: 'tenant-1',
        email: 'john@example.com',
        name: 'John',
        save,
      } as any;

      vi.mocked(findTenantByIdentifier).mockResolvedValue({ _id: 'tenant-1', identifier: 'mac-1' } as any);
      vi.mocked(findUserByEmailInTenant).mockResolvedValue(user);

      const req = mockRequest({ body: { email: 'john@example.com', tenantIdentifier: 'mac-1' } });
      const res = mockResponse();
      const next = mockNext();

      await forgotPassword(req, res, next);

      expect(findTenantByIdentifier).toHaveBeenCalledWith('mac-1');
      expect(findUserByEmailInTenant).toHaveBeenCalledWith('john@example.com', 'tenant-1');
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('rejects invalid token', async () => {
      vi.mocked(updateUserPasswordByResetToken).mockResolvedValue(null);

      const req = mockRequest({ body: { token: 'invalid', newPassword: 'new-password' } });
      const res = mockResponse();
      const next = mockNext();

      await resetPassword(req, res, next);

      expect(updateUserPasswordByResetToken).toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();
    });

    it('updates password with valid token', async () => {
      const updatedUser = { _id: 'u2', email: 'v@v.com' } as any;
      vi.mocked(updateUserPasswordByResetToken).mockResolvedValue(updatedUser);

      const req = mockRequest({ body: { token: 'valid-token', newPassword: 'new-password' } });
      const res = mockResponse();
      const next = mockNext();

      await resetPassword(req, res, next);

      expect(updateUserPasswordByResetToken).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
