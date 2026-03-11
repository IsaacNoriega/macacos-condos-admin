import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

import { validationResult } from 'express-validator';
import validateRequest from './validateRequest';
import { mockNext, mockRequest, mockResponse } from '../test/utils/httpMocks';

describe('validateRequest middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next when there are no validation errors', () => {
    vi.mocked(validationResult).mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    } as any);

    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    validateRequest(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 400 with normalized errors when validation fails', () => {
    vi.mocked(validationResult).mockReturnValue({
      isEmpty: () => false,
      array: () => [
        { type: 'field', path: 'email', msg: 'Email invalido' },
        { type: 'unknown', path: '', msg: 'Request invalido' },
      ],
    } as any);

    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    validateRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error de validacion',
      errors: [
        { field: 'email', message: 'Email invalido' },
        { field: 'request', message: 'Request invalido' },
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
