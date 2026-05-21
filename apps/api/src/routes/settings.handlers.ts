import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  notificationPreferencesSchema,
  notificationPreferencesResponseSchema,
  slaPolicyResponseSchema,
  slaPolicySchema,
  smtpSettingsResponseSchema,
  smtpSettingsSchema,
  testSmtpBodySchema,
  testSmtpResponseSchema,
} from '@usd/shared-types';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getOrgNotificationPreferences,
  getOrgSlaPolicy,
  getOrgSmtpSettings,
  putOrgNotificationPreferences,
  putOrgSlaPolicy,
  putOrgSmtpSettings,
} from '../db/tables/org-settings.js';
import { sendTestEmail } from '../services/email.service.js';
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
 * GET /api/settings/sla — org SLA policy (admin).
 */
export const getSlaPolicyHandler: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const policy = await getOrgSlaPolicy(req.auth.orgId);
    res.status(200).json(slaPolicyResponseSchema.parse({ data: policy }));
  }),
];

/**
 * PUT /api/settings/sla — update SLA policy (admin).
 */
export const putSlaPolicyHandler: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = slaPolicySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid SLA policy', 'VALIDATION', 400);
    }
    const saved = await putOrgSlaPolicy(req.auth.orgId, parsed.data);
    res.status(200).json(slaPolicyResponseSchema.parse({ data: saved }));
  }),
];

/**
 * GET /api/settings/smtp — SMTP config (admin).
 */
export const getSmtpSettingsHandler: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const settings = await getOrgSmtpSettings(req.auth.orgId);
    if (settings === undefined) {
      throw new AppError('SMTP not configured', 'NOT_FOUND', 404);
    }
    res.status(200).json(smtpSettingsResponseSchema.parse({ data: settings }));
  }),
];

/**
 * PUT /api/settings/smtp — save SMTP config (admin).
 */
export const putSmtpSettingsHandler: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = smtpSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid SMTP settings', 'VALIDATION', 400);
    }
    const saved = await putOrgSmtpSettings(req.auth.orgId, parsed.data);
    res.status(200).json(smtpSettingsResponseSchema.parse({ data: saved }));
  }),
];

/**
 * POST /api/settings/smtp/test — send test email (admin).
 */
export const postSmtpTestHandler: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const settings = await getOrgSmtpSettings(req.auth.orgId);
    if (settings === undefined) {
      throw new AppError('SMTP not configured', 'NOT_FOUND', 404);
    }
    const bodyParsed = testSmtpBodySchema.safeParse(req.body ?? {});
    const toEmail = bodyParsed.success && bodyParsed.data.toEmail !== undefined
      ? bodyParsed.data.toEmail
      : req.auth.email;
    await sendTestEmail(settings, toEmail);
    res.status(200).json(testSmtpResponseSchema.parse({ data: { ok: true as const } }));
  }),
];

/**
 * GET /api/settings/preferences — notification preferences (admin).
 */
export const getPreferencesHandler: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const prefs = await getOrgNotificationPreferences(req.auth.orgId);
    res.status(200).json(notificationPreferencesResponseSchema.parse({ data: prefs }));
  }),
];

/**
 * PUT /api/settings/preferences — update notification preferences (admin).
 */
export const putPreferencesHandler: RequestHandler[] = [
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (req.auth === undefined) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const parsed = notificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid preferences', 'VALIDATION', 400);
    }
    const saved = await putOrgNotificationPreferences(req.auth.orgId, parsed.data);
    res
      .status(200)
      .json(notificationPreferencesResponseSchema.parse({ data: saved }));
  }),
];
