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
 * Returns true for loopback clients (local dev and Playwright E2E).
 */
export function isLoopbackClient(req: Request): boolean {
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.includes('127.0.0.1')
  );
}

/**
 * Returns true when this request should not count toward the API rate limit.
 */
export function shouldBypassApiRateLimit(req: Request): boolean {
  if (shouldSkipApiRateLimit(req.path)) {
    return true;
  }
  if (process.env.E2E_DISABLE_RATE_LIMIT === 'true') {
    return true;
  }
  if (process.env.NODE_ENV === 'development' && isLoopbackClient(req)) {
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
    skip: (req) => shouldBypassApiRateLimit(req),
    handler: (_req: Request, res: Response) => {
      const body = rateLimitErrorBody();
      res.status(body.statusCode).json(body);
    },
  });
}

/** Default API rate limiter instance. */
export const apiRateLimiter = createApiRateLimiter();
