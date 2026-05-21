import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  createKbArticleBodySchema,
  kbSearchRequestSchema,
  updateKbArticleBodySchema,
} from '@usd/shared-types';
import { buildKbContext } from '../ai/buildKbContext.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { hasPostgresUrl } from '../db/postgres.client.js';
import {
  createKbArticle,
  deleteKbArticle,
  getKbArticle,
  listKbArticles,
  publishKbArticle,
  searchKbByTicket,
  updateKbArticle,
} from '../services/kb.service.js';
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
 * Ensures Postgres is configured before KB routes run.
 */
function requirePostgres(_req: Request, _res: Response, next: NextFunction): void {
  if (!hasPostgresUrl()) {
    next(new AppError('Knowledge base storage is not configured', 'KB_UNAVAILABLE', 503));
    return;
  }
  next();
}

/**
 * GET /api/kb — list articles (admin/manager).
 */
export const getKbList: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  requirePostgres,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const statusRaw = req.query.status;
    const status =
      statusRaw === 'draft' || statusRaw === 'published' ? statusRaw : undefined;
    const data = await listKbArticles(req.auth.orgId, status);
    res.status(200).json({ data, total: data.length });
  }),
];

/**
 * GET /api/kb/:kbId — article detail (admin/manager).
 */
export const getKbById: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  requirePostgres,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const kbId = req.params.kbId;
    if (typeof kbId !== 'string' || kbId.length === 0) {
      throw new AppError('Invalid kbId', 'VALIDATION', 400);
    }
    const data = await getKbArticle(req.auth.orgId, kbId);
    res.status(200).json({ data });
  }),
];

/**
 * POST /api/kb — create draft (admin/manager).
 */
export const postKb: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  requirePostgres,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = createKbArticleBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid KB create body', 'VALIDATION', 400);
    }
    const data = await createKbArticle(req.auth.orgId, req.auth.userId, parsed.data);
    res.status(201).json({ data });
  }),
];

/**
 * PUT /api/kb/:kbId — update draft (admin/manager).
 */
export const putKb: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  requirePostgres,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const kbId = req.params.kbId;
    if (typeof kbId !== 'string' || kbId.length === 0) {
      throw new AppError('Invalid kbId', 'VALIDATION', 400);
    }
    const parsed = updateKbArticleBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid KB update body', 'VALIDATION', 400);
    }
    const data = await updateKbArticle(req.auth.orgId, kbId, parsed.data);
    res.status(200).json({ data });
  }),
];

/**
 * DELETE /api/kb/:kbId — remove article (admin/manager).
 */
export const deleteKb: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  requirePostgres,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const kbId = req.params.kbId;
    if (typeof kbId !== 'string' || kbId.length === 0) {
      throw new AppError('Invalid kbId', 'VALIDATION', 400);
    }
    await deleteKbArticle(req.auth.orgId, kbId);
    res.status(204).send();
  }),
];

/**
 * POST /api/kb/:kbId/publish — embed and publish (admin/manager).
 */
export const postKbPublish: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  requirePostgres,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const kbId = req.params.kbId;
    if (typeof kbId !== 'string' || kbId.length === 0) {
      throw new AppError('Invalid kbId', 'VALIDATION', 400);
    }
    const data = await publishKbArticle(req.auth.orgId, kbId);
    res.status(200).json({ data });
  }),
];

/**
 * POST /api/kb/search — semantic search for a ticket (any authenticated role).
 */
export const postKbSearch: RequestHandler[] = [
  requireAuth,
  requirePostgres,
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = kbSearchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid KB search body', 'VALIDATION', 400);
    }
    const ctx = await buildKbContext(req.auth.orgId, parsed.data.ticketId);
    const data = await searchKbByTicket(req.auth.orgId, ctx);
    res.status(200).json({ data, total: data.length });
  }),
];
