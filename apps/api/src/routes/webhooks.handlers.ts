import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { SdpRequest } from '@usd/shared-types';
import {
  helpdeskWebhookBodySchema,
  jiraWebhookBodySchema,
  sdpRequestSchema,
} from '@usd/shared-types';
import { getServerEnv } from '../config/loadEnv.js';
import { upsertTicket, getTicketRecordOrUndefined } from '../db/tables/tickets.js';
import { mapHdRequestToTicket } from '../helpdesk/mapRequestToTicket.js';
import { mapJiraIssueToTicket } from '../jira/mapIssueToTicket.js';
import { enqueueSqsEvent } from '../messaging/enqueueSqsEvent.js';
import { broadcastTicketLifecycleEvent } from './ticket-broadcast.js';
import { AppError } from '../utils/errors.js';
import { assertValidHubSignature256 } from '../utils/jiraWebhookSignature.js';

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
  const prev = await getTicketRecordOrUndefined(record.ticketId);
  const merged = await upsertTicket(record);
  broadcastTicketLifecycleEvent(prev, merged);
  if (env.NODE_ENV === 'development' || env.DYNAMODB_ENDPOINT !== undefined) {
    enqueueSqsEvent('jira.webhook', json);
  }
  res.status(202).json({ accepted: true });
});

/**
 * Resolves Helpdesk webhook JSON to a single SDP `request` object.
 */
function parseHelpdeskRequestPayload(body: unknown): SdpRequest {
  const wrapped = helpdeskWebhookBodySchema.safeParse(body);
  if (wrapped.success && wrapped.data.request !== undefined) {
    return sdpRequestSchema.parse(wrapped.data.request);
  }
  return sdpRequestSchema.parse(body);
}

/**
 * POST /api/webhooks/helpdesk — JSON body; verifies `x-sdp-webhook-secret`, upserts ticket.
 */
export const postHelpdeskWebhook: RequestHandler = asyncHandler(async (req, res) => {
  const env = getServerEnv();
  const secret = env.HD_WEBHOOK_SECRET;
  if (secret === undefined || secret.length === 0) {
    throw new AppError('HD_WEBHOOK_SECRET is not configured', 'CONFIG', 500);
  }
  const hdr = req.headers['x-sdp-webhook-secret'];
  const hdrVal = Array.isArray(hdr) ? hdr[0] : hdr;
  if (hdrVal !== secret) {
    throw new AppError('Invalid webhook secret', 'UNAUTHORIZED', 401);
  }
  const payload = parseHelpdeskRequestPayload(req.body);
  const record = mapHdRequestToTicket({
    request: payload,
    orgId: env.HD_DEFAULT_ORG_ID,
  });
  const prev = await getTicketRecordOrUndefined(record.ticketId);
  const merged = await upsertTicket(record);
  broadcastTicketLifecycleEvent(prev, merged);
  if (env.NODE_ENV === 'development' || env.DYNAMODB_ENDPOINT !== undefined) {
    enqueueSqsEvent('helpdesk.webhook', req.body);
  }
  res.status(202).json({ accepted: true });
});
