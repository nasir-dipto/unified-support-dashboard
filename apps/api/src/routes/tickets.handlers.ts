import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  type CommentReplyKind,
  type TicketApiDto,
  postTicketCommentBodySchema,
  postTicketCommentResponseSchema,
  ticketCommentsListResponseSchema,
  ticketCrossLinkBodySchema,
  ticketCrossLinkResponseSchema,
  ticketDetailResponseSchema,
  ticketsListQuerySchema,
  ticketsListResponseSchema,
} from '@usd/shared-types';
import { getServerEnv } from '../config/loadEnv.js';
import { isHelpdeskEmailReplyEnabled } from '../config/helpdeskEmail.js';
import {
  buildTicketCommentSortKey,
  createTicketComment,
  deleteTicketComment,
  listTicketComments,
} from '../db/tables/comments.js';
import {
  getTicketById,
  linkTicketsBidirectional,
  listTickets,
  markSentimentStale,
} from '../db/tables/tickets.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  loadTicketMiddleware,
  requireTicketWriteAccess,
} from '../middleware/ticket-access.middleware.js';
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
    const query = parsed.data;
    const result = await listTickets({
      orgId: req.auth.orgId,
      page: query.page,
      limit: query.limit,
      source: query.source,
      priority: query.priority,
      status: query.status,
      project: query.project,
      q: query.q,
      sort: query.sort,
      mine: query.mine,
      bucket: query.bucket,
      user: {
        email: req.auth.email,
        displayName: req.auth.displayName,
      },
    });
    const body = ticketsListResponseSchema.parse({
      data: result.items,
      pagination: result.pagination,
      facets: result.facets,
    });
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
 * Resolves reply kind with defaults (Jira → jira_comment, HD → hd_note) and validates source pairing.
 */
function resolveReplyKind(ticket: TicketApiDto, requested: CommentReplyKind | undefined): CommentReplyKind {
  const kind = requested ?? (ticket.source === 'jira' ? 'jira_comment' : 'hd_note');
  if (ticket.source === 'jira' && kind !== 'jira_comment') {
    throw new AppError('Jira tickets only support jira_comment replies', 'VALIDATION', 400);
  }
  if (ticket.source === 'helpdesk' && kind === 'jira_comment') {
    throw new AppError('Helpdesk tickets cannot use jira_comment', 'VALIDATION', 400);
  }
  return kind;
}

/**
 * GET /api/tickets/:ticketId/comments — oldest-first conversation comments for the ticket.
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
  loadTicketMiddleware(),
  requireTicketWriteAccess(),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = postTicketCommentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid comment body', 'VALIDATION', 400);
    }
    const ticketId = ticketIdFromParams(req.params);
    const ticket = req.ticket ?? (await getTicketById(req.auth.orgId, ticketId));
    const replyKind = resolveReplyKind(ticket, parsed.data.replyKind);
    if (replyKind === 'hd_email' && !isHelpdeskEmailReplyEnabled(getServerEnv())) {
      throw new AppError(
        'Customer email replies are disabled (HELPDESK_EMAIL_REPLY_ENABLED)',
        'CONFIG',
        503,
      );
    }
    const created = await createTicketComment({
      orgId: req.auth.orgId,
      ticketId,
      body: parsed.data.body,
      authorUserId: req.auth.userId,
      authorEmail: req.auth.email,
    });
    const ticketCommentKey = buildTicketCommentSortKey(ticketId, created.commentId);
    const hdRef = { internalId: ticket.internalId, externalId: ticket.externalId };
    try {
      if (replyKind === 'jira_comment') {
        await jiraService.postComment(ticket.externalId, parsed.data.body);
      } else if (replyKind === 'hd_note') {
        await helpdeskService.postComment(hdRef, parsed.data.body);
      } else {
        await helpdeskService.postCustomerEmailReply(hdRef, parsed.data.body);
      }
    } catch (err) {
      await deleteTicketComment(req.auth.orgId, ticketCommentKey);
      throw err;
    }
    if (ticket.source === 'helpdesk') {
      await markSentimentStale(req.auth.orgId, ticketId);
    }
    broadcastWsEnvelope({
      type: 'comment_added',
      ticketId,
      orgId: req.auth.orgId,
      payload: {
        ticketId,
        commentId: created.commentId,
        body: created.body,
        commentSource: created.commentSource,
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
  loadTicketMiddleware(),
  requireTicketWriteAccess(),
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
