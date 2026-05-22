import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { aiInvokeRequestSchema } from '@usd/shared-types';
import { buildAiTicketContext } from '../ai/buildTicketContext.js';
import { buildBriefingContext } from '../ai/buildBriefingContext.js';
import { runMorningBriefing } from '../ai/briefing.js';
import { runCommentDraft } from '../ai/commentDraft.js';
import { runKbDraft } from '../ai/kbDraft.js';
import { runTriageSuggest } from '../ai/triage.js';
import { getTicketById } from '../db/tables/tickets.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { canWriteTicket } from '../utils/ticket-access.js';
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
 * POST /api/ai/invoke — triage_suggest or comment_draft (context built server-side).
 */
export const postAiInvoke: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = aiInvokeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid AI invoke body', 'VALIDATION', 400);
    }
    const body = parsed.data;

    if (body.feature === 'morning_briefing') {
      const allowed = req.auth.roles.some((r) => r === 'manager' || r === 'super_admin');
      if (!allowed) {
        throw new AppError('Forbidden', 'FORBIDDEN', 403);
      }
      const { summary, promptText } = await buildBriefingContext(req.auth.orgId);
      const result = await runMorningBriefing(summary, promptText);
      res.status(200).json(result);
      return;
    }

    const ticket = await getTicketById(req.auth.orgId, body.ticketId);
    if (!canWriteTicket(req.auth.roles, ticket, req.auth.email, req.auth.displayName)) {
      throw new AppError('Forbidden', 'FORBIDDEN', 403);
    }

    const ctx = await buildAiTicketContext(req.auth.orgId, body.ticketId);

    if (body.feature === 'triage_suggest') {
      const result = await runTriageSuggest(ctx);
      res.status(200).json(result);
      return;
    }

    if (body.feature === 'kb_draft') {
      const result = await runKbDraft(ctx);
      res.status(200).json(result);
      return;
    }

    const result = await runCommentDraft(ctx, body.tone);
    res.status(200).json(result);
  }),
];
