import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getTicketById } from '../db/tables/tickets.js';
import { AppError } from '../utils/errors.js';
import { canWriteTicket } from '../utils/ticket-access.js';

/**
 * Loads a ticket and attaches it to the request for downstream handlers.
 */
export function loadTicketMiddleware(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    void (async () => {
      if (req.auth === undefined) {
        next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
        return;
      }
      const rawId = req.params.ticketId;
      const ticketId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (ticketId === undefined || ticketId.length === 0) {
        next(new AppError('Missing ticket id', 'VALIDATION', 400));
        return;
      }
      try {
        const ticket = await getTicketById(req.auth.orgId, ticketId);
        req.ticket = ticket;
        next();
      } catch (err) {
        next(err);
      }
    })();
  };
}

/**
 * Requires write access to the ticket loaded by `loadTicketMiddleware`.
 */
export function requireTicketWriteAccess(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.auth === undefined) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }
    const ticket = req.ticket;
    if (ticket === undefined) {
      next(new AppError('Ticket not loaded', 'INTERNAL', 500));
      return;
    }
    if (!canWriteTicket(req.auth.roles, ticket, req.auth.email, req.auth.displayName)) {
      next(new AppError('Forbidden', 'FORBIDDEN', 403));
      return;
    }
    next();
  };
}
