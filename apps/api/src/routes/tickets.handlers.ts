import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  ticketsListQuerySchema,
  ticketsListResponseSchema,
  ticketDetailResponseSchema,
} from '@usd/shared-types';
import { getTicketById, listTickets } from '../db/tables/tickets.js';
import { requireAuth } from '../middleware/auth.middleware.js';
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
 * GET /api/tickets — list tickets for the signed-in org.
 */
export const getTickets: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = ticketsListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Invalid query parameters', 'VALIDATION', 400);
    }
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const { items, cursor, total } = await listTickets({
      orgId: req.auth.orgId,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
    });
    const body = ticketsListResponseSchema.parse({ data: items, cursor, total });
    res.json(body);
  }),
];

/**
 * GET /api/tickets/:ticketId — ticket detail scoped to org.
 */
export const getTicket: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const rawId = req.params.ticketId;
    const ticketId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (ticketId === undefined || ticketId.length === 0) {
      throw new AppError('Missing ticket id', 'VALIDATION', 400);
    }
    const data = await getTicketById(req.auth.orgId, ticketId);
    res.json(ticketDetailResponseSchema.parse({ data }));
  }),
];
