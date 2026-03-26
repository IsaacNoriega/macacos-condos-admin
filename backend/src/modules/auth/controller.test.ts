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
  updateUserPasswordByResetToken: vi.fn(),
}));

import { forgotPassword, resetPassword } from './controller';
import { findUserByEmailInTenant, updateUserPasswordByResetToken } from '../users/service';
import { mockNext, mockRequest, mockResponse } from '../../test/utils/httpMocks';

describe('auth controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('forgotPassword returns reset token in non-production', async () => {
    const save = vi.fn();
    const user = {
      _id: 'user-1',
      tenantId: 'tenant-1',
      email: 'john@example.com',
      save,
    } as any;

    vi.mocked(findUserByEmailInTenant).mockResolvedValue(user);

    const req = mockRequest({ body: { email: 'john@example.com', tenantId: 'tenant-1' } });
    const res = mockResponse();
    const next = mockNext();

    await forgotPassword(req, res, next);

    expect(findUserByEmailInTenant).toHaveBeenCalledWith('john@example.com', 'tenant-1');
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

  it('resetPassword rejects invalid token', async () => {
    vi.mocked(updateUserPasswordByResetToken).mockResolvedValue(null);

    const req = mockRequest({ body: { token: 'invalid', newPassword: 'new-password' } });
    const res = mockResponse();
    const next = mockNext();

    await resetPassword(req, res, next);

    expect(updateUserPasswordByResetToken).toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('resetPassword updates password with valid token', async () => {
    const updatedUser = {
      _id: 'user-2',
      tenantId: 'tenant-2',
      email: 'valid@example.com',
    } as any;

    vi.mocked(updateUserPasswordByResetToken).mockResolvedValue(updatedUser);

    const req = mockRequest({ body: { token: 'valid-token', newPassword: 'new-password' } });
    const res = mockResponse();
    const next = mockNext();

    await resetPassword(req, res, next);

    expect(updateUserPasswordByResetToken).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
