export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const toError = (err: unknown): Error => {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error('Unexpected error');
};
