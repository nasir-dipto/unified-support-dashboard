import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  jiraWebhookBodySchema,
  ticketsListQuerySchema,
  ticketsListResponseSchema,
  ticketDetailResponseSchema,
} from '@usd/shared-types';
import { mapJiraIssueToTicket } from '../jira/mapIssueToTicket.js';
import { getTicketById, listTickets, upsertTicket } from '../db/tables/tickets.js';
import { enqueueSqsEvent } from '../messaging/enqueueSqsEvent.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AppError } from '../utils/errors.js';
import { assertValidHubSignature256 } from '../utils/jiraWebhookSignature.js';
import { getServerEnv } from '../config/loadEnv.js';

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

/**
 * POST /api/webhooks/jira — raw body; verifies `x-hub-signature-256`, upserts ticket (local direct write).
 */
export const postJiraWebhook: RequestHandler = asyncHandler(async (req, res) => {
  const env = getServerEnv();
  const secret = env.JIRA_WEBHOOK_SECRET;
  if (secret === undefined || secret.length === 0) {
    throw new AppError('JIRA_WEBHOOK_SECRET is not configured', 'CONFIG', 500);
  }
  const rawBody: unknown = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    throw new AppError('Expected raw body buffer', 'VALIDATION', 400);
  }
  const sig = req.headers['x-hub-signature-256'];
  const sigStr = Array.isArray(sig) ? sig[0] : sig;
  assertValidHubSignature256(rawBody, sigStr, secret);
  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString('utf8')) as unknown;
  } catch {
    throw new AppError('Invalid JSON body', 'VALIDATION', 400);
  }
  const webhookParsed = jiraWebhookBodySchema.safeParse(json);
  if (!webhookParsed.success) {
    throw new AppError('Invalid webhook payload', 'VALIDATION', 400);
  }
  if (webhookParsed.data.issue === undefined) {
    throw new AppError('Webhook missing issue', 'VALIDATION', 400);
  }
  const record = mapJiraIssueToTicket({
    issue: webhookParsed.data.issue,
    orgId: env.JIRA_DEFAULT_ORG_ID,
  });
  await upsertTicket(record);
  if (env.NODE_ENV === 'development' || env.DYNAMODB_ENDPOINT !== undefined) {
    enqueueSqsEvent('jira.webhook', json);
  }
  res.status(202).json({ accepted: true });
});
