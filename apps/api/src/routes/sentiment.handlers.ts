import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  sentimentSummaryResponseSchema,
  ticketSentimentSchema,
} from '@usd/shared-types';
import { listHdTicketsWithSentiment } from '../db/tables/tickets.js';
import { buildSentimentSummary } from '../sentiment/aggregateSummary.js';
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
 * GET /api/sentiment/summary — Helpdesk sentiment aggregates for manager charts.
 */
export const getSentimentSummary: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const filterRaw = req.query.sentiment;
    let filterSentiment: 'positive' | 'neutral' | 'negative' | undefined;
    if (typeof filterRaw === 'string' && filterRaw.length > 0) {
      const parsed = ticketSentimentSchema.safeParse(filterRaw);
      if (parsed.success) {
        filterSentiment = parsed.data;
      }
    }
    const records = await listHdTicketsWithSentiment(req.auth.orgId);
    const summary = buildSentimentSummary(records, filterSentiment);
    res.status(200).json(sentimentSummaryResponseSchema.parse(summary));
  }),
];
