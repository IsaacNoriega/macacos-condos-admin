import { NextFunction, Request, Response } from 'express';
import { vi } from 'vitest';

export const mockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as Request;
};

export const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

export const mockNext = (): NextFunction => vi.fn() as unknown as NextFunction;
