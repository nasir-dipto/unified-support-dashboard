import type { Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 100;

/**
 * Returns true when the request path should bypass API rate limiting.
 */
export function shouldSkipApiRateLimit(path: string): boolean {
  if (path === '/api/health' || path === '/api/health/detail') {
    return true;
  }
  if (path.startsWith('/api/webhooks')) {
    return true;
  }
  return false;
}

/**
 * Builds the standard 429 body for rate-limited requests.
 */
export function rateLimitErrorBody(): {
  error: string;
  code: string;
  statusCode: number;
} {
  return {
    error: 'Too many requests',
    code: 'RATE_LIMITED',
    statusCode: 429,
  };
}

/**
 * Express rate limiter: 100 requests per minute per IP on `/api` routes.
 * Skips health probes and inbound webhooks.
 */
export function createApiRateLimiter(options?: {
  windowMs?: number;
  max?: number;
}): RequestHandler {
  return rateLimit({
    windowMs: options?.windowMs ?? RATE_LIMIT_WINDOW_MS,
    max: options?.max ?? RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => shouldSkipApiRateLimit(req.path),
    handler: (_req: Request, res: Response) => {
      const body = rateLimitErrorBody();
      res.status(body.statusCode).json(body);
    },
  });
}

/** Default API rate limiter instance. */
export const apiRateLimiter = createApiRateLimiter();
