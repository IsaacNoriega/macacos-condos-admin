import { describe, expect, it } from 'vitest';
import { AppError, toError } from './httpError';

describe('httpError utilities', () => {
  describe('AppError', () => {
    it('creates error with message, statusCode and name', () => {
      const err = new AppError('Not found', 404);
      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
      expect(err.name).toBe('AppError');
      expect(err).toBeInstanceOf(Error);
    });

    it('defaults statusCode to 500 when not provided', () => {
      const err = new AppError('Internal error');
      expect(err.statusCode).toBe(500);
    });

    it('stores details when provided', () => {
      const err = new AppError('Bad request', 400, { cause: 'Missing field' });
      expect(err.details).toEqual({ cause: 'Missing field' });
    });

    it('details is undefined when not provided', () => {
      const err = new AppError('OK', 200);
      expect(err.details).toBeUndefined();
    });
  });

  describe('toError', () => {
    it('returns the same Error instance when passed an Error', () => {
      const original = new Error('original');
      expect(toError(original)).toBe(original);
    });

    it('wraps a string into an Error', () => {
      const result = toError('something went wrong');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('something went wrong');
    });

    it('returns generic Error for unknown types (number)', () => {
      const result = toError(42);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unexpected error');
    });

    it('returns generic Error for null', () => {
      const result = toError(null);
      expect(result.message).toBe('Unexpected error');
    });

    it('returns generic Error for undefined', () => {
      const result = toError(undefined);
      expect(result.message).toBe('Unexpected error');
    });

    it('returns generic Error for objects', () => {
      const result = toError({ code: 500 });
      expect(result.message).toBe('Unexpected error');
    });
  });
});
