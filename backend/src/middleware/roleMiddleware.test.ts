import { describe, expect, it } from 'vitest';
import roleMiddleware from './roleMiddleware';
import { mockNext, mockRequest, mockResponse } from '../test/utils/httpMocks';

describe('roleMiddleware', () => {
  it('returns 401 when user role is missing', () => {
    const middleware = roleMiddleware(['admin']);
    const req = mockRequest({ user: {} } as any);
    const res = mockResponse();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role is not allowed', () => {
    const middleware = roleMiddleware(['superadmin']);
    const req = mockRequest({ user: { role: 'residente' } } as any);
    const res = mockResponse();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when role is allowed', () => {
    const middleware = roleMiddleware(['admin', 'superadmin']);
    const req = mockRequest({ user: { role: 'admin' } } as any);
    const res = mockResponse();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
