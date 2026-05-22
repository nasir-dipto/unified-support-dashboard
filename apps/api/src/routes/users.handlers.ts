import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  inviteUserRequestSchema,
  inviteUserResponseSchema,
  usersListResponseSchema,
} from '@usd/shared-types';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { inviteOrgUser, listOrgUsers } from '../services/users.service.js';
import { canListUsers, canMutateUsers } from '../utils/role-helpers.js';
import { AppError } from '../utils/errors.js';

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
 * GET /api/users — list org users (manager read-only, super_admin full).
 */
export const getUsers: RequestHandler[] = [
  requireAuth,
  requireRole('manager', 'super_admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    if (!canListUsers(req.auth.roles)) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403);
    }
    const data = await listOrgUsers(req.auth.orgId);
    res.json(usersListResponseSchema.parse({ data, total: data.length }));
  }),
];

/**
 * POST /api/users/invite — invite user via email (super_admin only).
 */
export const postInviteUser: RequestHandler[] = [
  requireAuth,
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    if (!canMutateUsers(req.auth.roles)) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403);
    }
    const parsed = inviteUserRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid invite body', 'VALIDATION', 400);
    }
    await inviteOrgUser({
      orgId: req.auth.orgId,
      inviterRoles: req.auth.roles,
      inviterUserId: req.auth.userId,
      email: parsed.data.email,
      role: parsed.data.role,
    });
    res.status(201).json(
      inviteUserResponseSchema.parse({ status: 'ok', email: parsed.data.email }),
    );
  }),
];
