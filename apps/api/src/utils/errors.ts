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

/** Upstream integration failures that may embed raw vendor response bodies. */
const INTEGRATION_ERROR_CODES = new Set([
  'JIRA_API',
  'HELPDESK_API',
  'ZOHO_AUTH',
  'SMTP_ERROR',
]);

const GENERIC_INTERNAL_MESSAGE = 'An unexpected error occurred';
const GENERIC_INTEGRATION_MESSAGE = 'Integration error — please try again';

/**
 * Logs full error details server-side without exposing them to clients.
 */
export function logApiError(err: unknown): void {
  if (err instanceof AppError) {
    if (INTEGRATION_ERROR_CODES.has(err.code)) {
      console.error(`[api] ${err.code}:`, err.message);
      return;
    }
    return;
  }
  if (err instanceof Error) {
    console.error('[api] unhandled error:', err.message, err.stack);
    return;
  }
  console.error('[api] unhandled error:', err);
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
    if (INTEGRATION_ERROR_CODES.has(err.code)) {
      return {
        error: GENERIC_INTEGRATION_MESSAGE,
        code: err.code,
        statusCode: err.statusCode,
      };
    }
    return {
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
    };
  }
  if (err instanceof Error) {
    return {
      error: GENERIC_INTERNAL_MESSAGE,
      code: 'INTERNAL',
      statusCode: 500,
    };
  }
  return {
    error: GENERIC_INTERNAL_MESSAGE,
    code: 'INTERNAL',
    statusCode: 500,
  };
}
