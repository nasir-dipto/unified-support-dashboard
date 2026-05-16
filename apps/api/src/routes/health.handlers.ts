import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { healthDetailResponseSchema } from '@usd/shared-types';
import { buildHealthDetail } from '../services/health.service.js';

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
 * GET /api/health/detail — dependency probes for DynamoDB, Redis, and WebSocket fan-out.
 */
export const getHealthDetail: RequestHandler = asyncHandler(async (_req, res) => {
  const detail = await buildHealthDetail();
  const body = healthDetailResponseSchema.parse(detail);
  const statusCode = body.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(body);
});
