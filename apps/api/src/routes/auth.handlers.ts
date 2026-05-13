import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  refreshRequestSchema,
  resetPasswordRequestSchema,
  stubOkSchema,
} from '@usd/shared-types';
import {
  loginWithPassword,
  logoutFromAccessToken,
  refreshSession,
} from '../services/auth.service.js';
import { AppError } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.middleware.js';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * POST /api/auth/login — email + password within an org.
 */
export const postLogin: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Invalid request body', 'VALIDATION', 400);
  }
  const out = await loginWithPassword(
    parsed.data.orgId,
    parsed.data.email,
    parsed.data.password,
  );
  res.json(out);
});

/**
 * POST /api/auth/refresh — rotate refresh token and issue new access token.
 */
export const postRefresh: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = refreshRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Invalid request body', 'VALIDATION', 400);
  }
  const out = await refreshSession(parsed.data.refreshToken);
  res.json(out);
});

/**
 * POST /api/auth/logout — clears server-side refresh binding (requires access JWT).
 */
export const postLogout: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = req.accessTokenRaw;
    if (token === undefined || token.length === 0) {
      throw new AppError('Missing bearer token', 'UNAUTHORIZED', 401);
    }
    await logoutFromAccessToken(token);
    res.status(204).send();
  }),
];

/**
 * POST /api/auth/forgot-password — stub until SES-backed flow exists.
 */
export const postForgotPassword: RequestHandler = asyncHandler((req, res) => {
  const parsed = forgotPasswordRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Invalid request body', 'VALIDATION', 400);
  }
  // TODO(USD-PH1): Send reset email via SES + store reset token in DynamoDB.
  void parsed.data;
  res.json(stubOkSchema.parse({ status: 'ok' as const }));
});

/**
 * POST /api/auth/reset-password — stub until SES-backed flow exists.
 */
export const postResetPassword: RequestHandler = asyncHandler((req, res) => {
  const parsed = resetPasswordRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Invalid request body', 'VALIDATION', 400);
  }
  // TODO(USD-PH1): Validate reset token and update password hash in DynamoDB.
  void parsed.data;
  res.json(stubOkSchema.parse({ status: 'ok' as const }));
});

/**
 * GET /api/auth/me — returns the authenticated principal from the access JWT.
 */
export const getMe: RequestHandler[] = [
  requireAuth,
  asyncHandler((req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    res.json({
      user: {
        userId: req.auth.userId,
        orgId: req.auth.orgId,
        email: req.auth.email,
        roles: req.auth.roles,
      },
    });
  }),
];
