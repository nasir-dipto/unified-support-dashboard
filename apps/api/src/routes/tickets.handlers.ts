import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  postTicketCommentBodySchema,
  postTicketCommentResponseSchema,
  ticketCommentsListResponseSchema,
  ticketCrossLinkBodySchema,
  ticketCrossLinkResponseSchema,
  ticketDetailResponseSchema,
  ticketsListQuerySchema,
  ticketsListResponseSchema,
} from '@usd/shared-types';
import {
  buildTicketCommentSortKey,
  createTicketComment,
  deleteTicketComment,
  listTicketComments,
} from '../db/tables/comments.js';
import { getTicketById, linkTicketsBidirectional, listTickets } from '../db/tables/tickets.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as helpdeskService from '../services/helpdesk.service.js';
import * as jiraService from '../services/jira.service.js';
import { broadcastWsEnvelope } from '../services/websocket.service.js';
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

function ticketIdFromParams(params: { ticketId?: string }): string {
  const ticketId = params.ticketId;
  if (ticketId === undefined || ticketId.length === 0) {
    throw new AppError('Missing ticket id', 'VALIDATION', 400);
  }
  return ticketId;
}

/**
 * GET /api/tickets/:ticketId/comments — newest-first USD comments for the ticket.
 */
export const getTicketComments: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const ticketId = ticketIdFromParams(req.params);
    await getTicketById(req.auth.orgId, ticketId);
    const { items, total } = await listTicketComments(req.auth.orgId, ticketId, 50);
    res.json(ticketCommentsListResponseSchema.parse({ data: items, total }));
  }),
];

/**
 * POST /api/tickets/:ticketId/comments — persist locally, mirror to Jira/SDP, broadcast WS.
 */
export const postTicketComment: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = postTicketCommentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid comment body', 'VALIDATION', 400);
    }
    const ticketId = ticketIdFromParams(req.params);
    const ticket = await getTicketById(req.auth.orgId, ticketId);
    const created = await createTicketComment({
      orgId: req.auth.orgId,
      ticketId,
      body: parsed.data.body,
      authorUserId: req.auth.userId,
      authorEmail: req.auth.email,
    });
    const ticketCommentKey = buildTicketCommentSortKey(ticketId, created.commentId);
    try {
      if (ticket.source === 'jira') {
        await jiraService.postComment(ticket.externalId, parsed.data.body);
      } else {
        await helpdeskService.postComment(
          { internalId: ticket.internalId, externalId: ticket.externalId },
          parsed.data.body,
        );
      }
    } catch (err) {
      await deleteTicketComment(req.auth.orgId, ticketCommentKey);
      throw err;
    }
    broadcastWsEnvelope({
      type: 'comment_added',
      ticketId,
      orgId: req.auth.orgId,
      payload: {
        ticketId,
        commentId: created.commentId,
        body: created.body,
        authorUserId: created.authorUserId,
        authorEmail: created.authorEmail,
        createdAt: created.createdAt,
      },
    });
    const responseBody = postTicketCommentResponseSchema.parse({ data: created });
    res.status(201).json(responseBody);
  }),
];

/**
 * POST /api/tickets/:ticketId/link — bidirectional link between one Jira and one Helpdesk ticket.
 */
export const postTicketLink: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = ticketCrossLinkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid link payload', 'VALIDATION', 400);
    }
    const ticketId = ticketIdFromParams(req.params);
    const result = await linkTicketsBidirectional({
      orgId: req.auth.orgId,
      ticketId,
      linkedTicketId: parsed.data.linkedTicketId,
    });
    res.json(ticketCrossLinkResponseSchema.parse({ data: result }));
  }),
];
