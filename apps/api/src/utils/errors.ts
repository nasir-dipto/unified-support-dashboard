/**
 * Typed application error with HTTP status and stable machine code.
 */
export class AppError extends Error {
  public readonly code: string;

  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Maps unknown errors to the public API error envelope.
 */
export function toApiErrorBody(err: unknown): {
  error: string;
  code: string;
  statusCode: number;
} {
  if (err instanceof AppError) {
    return {
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
    };
  }
  if (err instanceof Error) {
    return {
      error: err.message,
      code: 'INTERNAL',
      statusCode: 500,
    };
  }
  return {
    error: 'Unexpected error',
    code: 'INTERNAL',
    statusCode: 500,
  };
}
