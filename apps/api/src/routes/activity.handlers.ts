import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { activityRecentQuerySchema, activityRecentResponseSchema } from '@usd/shared-types';
import {
  ACTIVITY_RAW_FETCH_LIMIT,
  scopeActivityEventsForRole,
} from '../activity/scopeActivityEvents.js';
import { listAssignedTicketIds } from '../db/tables/tickets.js';
import { listRecentWsActivityEvents } from '../db/tables/ws-activity-events.js';
import { AppError } from '../utils/errors.js';
import { isTechnician } from '../utils/role-helpers.js';
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
    const rawItems = await listRecentWsActivityEvents(req.auth.orgId, ACTIVITY_RAW_FETCH_LIMIT);

    let assignedTicketIds = new Set<string>();
    if (isTechnician(req.auth.roles)) {
      assignedTicketIds = await listAssignedTicketIds(req.auth.orgId, {
        email: req.auth.email,
        displayName: req.auth.displayName,
      });
    }

    const items = scopeActivityEventsForRole(
      rawItems,
      req.auth.roles,
      assignedTicketIds,
      parsed.data.limit,
    );
    res.json(
      activityRecentResponseSchema.parse({
        data: items,
        total: items.length,
      }),
    );
  }),
];
