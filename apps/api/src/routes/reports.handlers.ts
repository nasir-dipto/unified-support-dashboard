import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { reportQuerySchema } from '@usd/shared-types';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getResolutionReport,
  getSlaReport,
  getTeamReport,
  getVolumeReport,
} from '../services/reports.service.js';
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

function parseReportQuery(req: Request) {
  const parsed = reportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError('Invalid query', 'VALIDATION', 400);
  }
  return parsed.data;
}

async function sendReport(
  req: Request,
  res: Response,
  loader: (
    orgId: string,
    days: 7 | 30,
    format: 'json' | 'csv',
  ) => Promise<{ contentType: string; body: unknown }>,
): Promise<void> {
  if (req.auth === undefined) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
  }
  const q = parseReportQuery(req);
  const result = await loader(req.auth.orgId, q.days, q.format);
  res.type(result.contentType);
  if (q.format === 'csv') {
    res.status(200).send(result.body);
    return;
  }
  res.status(200).json(result.body);
}

/**
 * GET /api/reports/volume — ticket volume trend (admin).
 */
export const getReportsVolume: RequestHandler[] = [
  requireAuth,
  requireRole('manager', 'super_admin'),
  asyncHandler(async (req, res) => {
    await sendReport(req, res, getVolumeReport);
  }),
];

/**
 * GET /api/reports/resolution — opened vs resolved (admin).
 */
export const getReportsResolution: RequestHandler[] = [
  requireAuth,
  requireRole('manager', 'super_admin'),
  asyncHandler(async (req, res) => {
    await sendReport(req, res, getResolutionReport);
  }),
];

/**
 * GET /api/reports/sla — SLA met vs breached (admin).
 */
export const getReportsSla: RequestHandler[] = [
  requireAuth,
  requireRole('manager', 'super_admin'),
  asyncHandler(async (req, res) => {
    await sendReport(req, res, getSlaReport);
  }),
];

/**
 * GET /api/reports/team — assignee performance (admin).
 */
export const getReportsTeam: RequestHandler[] = [
  requireAuth,
  requireRole('manager', 'super_admin'),
  asyncHandler(async (req, res) => {
    await sendReport(req, res, getTeamReport);
  }),
];
