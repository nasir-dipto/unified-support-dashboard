import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { SupportRole } from '@usd/shared-types';
import { AppError } from '../utils/errors.js';

/**
 * Requires an authenticated request whose roles intersect the allowed set.
 */
export function requireRole(...allowed: SupportRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.auth === undefined) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }
    const ok = req.auth.roles.some((r) => allowed.includes(r));
    if (!ok) {
      next(new AppError('Forbidden', 'FORBIDDEN', 403));
      return;
    }
    next();
  };
}
