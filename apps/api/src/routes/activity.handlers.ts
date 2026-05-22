import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { activityRecentQuerySchema, activityRecentResponseSchema } from '@usd/shared-types';
import { listRecentWsActivityEvents } from '../db/tables/ws-activity-events.js';
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
 * GET /api/activity/recent — last N WebSocket events for the signed-in org.
 */
export const getRecentActivity: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = activityRecentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Invalid query', 'VALIDATION', 400);
    }
    const items = await listRecentWsActivityEvents(req.auth.orgId, parsed.data.limit);
    res.json(
      activityRecentResponseSchema.parse({
        data: items,
        total: items.length,
      }),
    );
  }),
];
