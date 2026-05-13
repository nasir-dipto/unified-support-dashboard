import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Verifies Bearer access JWT and attaches `req.auth` and `req.accessTokenRaw`.
 */
export const requireAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  void (async () => {
    const authHeader = req.headers.authorization;
    if (authHeader === undefined || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid Authorization header', 'UNAUTHORIZED', 401);
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (token.length === 0) {
      throw new AppError('Missing bearer token', 'UNAUTHORIZED', 401);
    }
    const payload = await verifyAccessToken(token);
    req.accessTokenRaw = token;
    req.auth = {
      userId: payload.sub,
      orgId: payload.orgId,
      email: payload.email,
      roles: payload.roles,
    };
    next();
  })().catch(next);
};
