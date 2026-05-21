import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { notificationsListResponseSchema } from '@usd/shared-types';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getNotificationsForOrg,
  markRead,
} from '../services/notifications.service.js';
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
 * GET /api/notifications — in-app notifications for the signed-in org.
 */
export const listNotificationsHandler: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const { items, unreadCount } = await getNotificationsForOrg(req.auth.orgId);
    res.status(200).json(
      notificationsListResponseSchema.parse({
        data: items,
        total: items.length,
        unreadCount,
      }),
    );
  }),
];

/**
 * POST /api/notifications/:notificationId/read — mark one notification read.
 */
export const markNotificationReadHandler: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const notificationId = req.params.notificationId;
    if (typeof notificationId !== 'string' || notificationId.length === 0) {
      throw new AppError('Invalid notification id', 'VALIDATION', 400);
    }
    const updated = await markRead(req.auth.orgId, notificationId);
    if (updated === undefined) {
      throw new AppError('Notification not found', 'NOT_FOUND', 404);
    }
    res.status(200).json({ data: updated });
  }),
];
