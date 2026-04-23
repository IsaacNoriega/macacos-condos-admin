import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('signed-jwt-token'),
  },
}));

import { forgotPassword, login, register, resetPassword } from './controller';
import {
  createUserInTenant,
  findUserByEmailInTenant,
  findUsersByEmail,
  updateUserPasswordByResetToken,
} from '../users/service';
import bcrypt from 'bcrypt';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('auth controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('returns 400 when required fields are missing', async () => {
      const req = mockRequest({ body: { email: 'a@b.com' } });
      const res = mockResponse();
      const next = mockNext();

      await register(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns 400 when email already exists in tenant', async () => {
      vi.mocked(findUserByEmailInTenant).mockResolvedValue({ _id: 'existing' } as any);

      const req = mockRequest({
        body: {
          name: 'Alice',
          email: 'alice@example.com',
          password: '123456',
          role: 'residente',
          tenantId: 'tenant-1',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      await register(req, res, next);

      expect(findUserByEmailInTenant).toHaveBeenCalledWith('alice@example.com', 'tenant-1');
      expect(next).toHaveBeenCalledOnce();
    });

    it('creates user and returns 201 on success', async () => {
      vi.mocked(findUserByEmailInTenant).mockResolvedValue(null);
      const toObject = () => ({ _id: 'u1', email: 'alice@example.com', role: 'residente' });
      vi.mocked(createUserInTenant).mockResolvedValue({
        _id: 'u1',
        tenantId: 'tenant-1',
        email: 'alice@example.com',
        role: 'residente',
        toObject,
      } as any);

      const req = mockRequest({
        body: {
          name: 'Alice',
          email: 'alice@example.com',
          password: '123456',
          role: 'residente',
          tenantId: 'tenant-1',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      await register(req, res, next);

      expect(createUserInTenant).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns error when no user found with email', async () => {
      vi.mocked(findUsersByEmail).mockResolvedValue([]);

      const req = mockRequest({ body: { email: 'nobody@x.com', password: '123' } });
      const res = mockResponse();
      const next = mockNext();

      await login(req, res, next);

      expect(findUsersByEmail).toHaveBeenCalledWith('nobody@x.com');
      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when multiple accounts exist for the same email', async () => {
      vi.mocked(findUsersByEmail).mockResolvedValue([
        { _id: 'u1', tenantId: 't1' } as any,
        { _id: 'u2', tenantId: 't2' } as any,
      ]);

      const req = mockRequest({ body: { email: 'dup@x.com', password: '123' } });
      const res = mockResponse();
      const next = mockNext();

      await login(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns error when password is invalid', async () => {
      vi.mocked(findUsersByEmail).mockResolvedValue([
        { _id: 'u1', tenantId: 't1', password: 'hashed', email: 'a@b.com', role: 'admin' } as any,
      ]);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const req = mockRequest({ body: { email: 'a@b.com', password: 'wrong' } });
      const res = mockResponse();
      const next = mockNext();

      await login(req, res, next);

      expect(bcrypt.compare).toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();
    });

    it('returns token on successful login', async () => {
      const toObject = () => ({ _id: 'u1', email: 'a@b.com', role: 'admin' });
      vi.mocked(findUsersByEmail).mockResolvedValue([
        { _id: 'u1', tenantId: 't1', password: 'hashed', email: 'a@b.com', role: 'admin', toObject } as any,
      ]);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const req = mockRequest({ body: { email: 'a@b.com', password: 'correct' } });
      const res = mockResponse();
      const next = mockNext();

      await login(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── forgotPassword ──────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns error when user is not found', async () => {
      vi.mocked(findUserByEmailInTenant).mockResolvedValue(null);

      const req = mockRequest({ body: { email: 'x@x.com', tenantId: 'tenant-1' } });
      const res = mockResponse();
      const next = mockNext();

      await forgotPassword(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('returns reset token in non-production environment', async () => {
      const save = vi.fn();
      vi.mocked(findUserByEmailInTenant).mockResolvedValue({
        _id: 'u1',
        tenantId: 'tenant-1',
        email: 'john@example.com',
        save,
      } as any);

      const req = mockRequest({ body: { email: 'john@example.com', tenantId: 'tenant-1' } });
      const res = mockResponse();
      const next = mockNext();

      await forgotPassword(req, res, next);

      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          resetToken: expect.any(String),
          expiresAt: expect.any(String),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── resetPassword ───────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('returns error when token is invalid or expired', async () => {
      vi.mocked(updateUserPasswordByResetToken).mockResolvedValue(null);

      const req = mockRequest({ body: { token: 'bad-token', newPassword: 'newpass' } });
      const res = mockResponse();
      const next = mockNext();

      await resetPassword(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('updates password with a valid token', async () => {
      vi.mocked(updateUserPasswordByResetToken).mockResolvedValue({
        _id: 'u1',
        tenantId: 'tenant-1',
        email: 'valid@x.com',
      } as any);

      const req = mockRequest({ body: { token: 'valid-token', newPassword: 'newpass' } });
      const res = mockResponse();
      const next = mockNext();

      await resetPassword(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Contraseña actualizada correctamente',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
