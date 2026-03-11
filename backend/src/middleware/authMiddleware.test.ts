import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import authMiddleware from './authMiddleware';
import { mockNext, mockRequest, mockResponse } from '../test/utils/httpMocks';

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 401 when token is missing', () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'No token provided',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next when token is valid', () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 'u1', role: 'admin' } as any);

    const req = mockRequest({ headers: { authorization: 'Bearer valid-token' } }) as any;
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(req.user).toEqual({ id: 'u1', role: 'admin' });
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const req = mockRequest({ headers: { authorization: 'Bearer bad-token' } });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid or expired token',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
