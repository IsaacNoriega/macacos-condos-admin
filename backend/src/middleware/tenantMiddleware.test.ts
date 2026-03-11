import { describe, expect, it } from 'vitest';
import tenantMiddleware from './tenantMiddleware';
import { mockNext, mockRequest, mockResponse } from '../test/utils/httpMocks';

describe('tenantMiddleware', () => {
  it('returns 403 when tenantId is missing in user context', () => {
    const req = mockRequest({ user: { id: 'u1' } } as any);
    const res = mockResponse();
    const next = mockNext();

    tenantMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'No tenantId found in token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches tenantId and calls next when available', () => {
    const req = mockRequest({ user: { id: 'u1', tenantId: 't1' } } as any) as any;
    const res = mockResponse();
    const next = mockNext();

    tenantMiddleware(req, res, next);

    expect(req.tenantId).toBe('t1');
    expect(next).toHaveBeenCalled();
  });
});
