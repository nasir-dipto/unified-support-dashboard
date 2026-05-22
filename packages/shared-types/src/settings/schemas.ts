import { z } from 'zod';
import { ticketPrioritySchema } from '../tickets/schemas.js';

/** SLA hours per priority (defaults: 2/4/8/24). */
export const slaPolicySchema = z.object({
  critical: z.number().positive(),
  high: z.number().positive(),
  medium: z.number().positive(),
  low: z.number().positive(),
});

export type SlaPolicy = z.infer<typeof slaPolicySchema>;

export const defaultSlaPolicy: SlaPolicy = {
  critical: 2,
  high: 4,
  medium: 8,
  low: 24,
};

/** Org SMTP settings (stored in support_notification_rules under ruleType `smtp`). */
export const smtpSettingsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean(),
  user: z.string().optional(),
  password: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string().min(1).optional(),
});

export type SmtpSettings = z.infer<typeof smtpSettingsSchema>;

/** Mailhog defaults for local development. */
export const defaultLocalSmtpSettings: SmtpSettings = {
  host: 'localhost',
  port: 1025,
  secure: false,
  fromEmail: 'noreply@usd.dev',
  fromName: 'Unified Support',
};

export const notificationPreferencesSchema = z.object({
  slaBreachEmail: z.boolean(),
  criticalTicketEmail: z.boolean(),
  churnRiskInApp: z.boolean(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const defaultNotificationPreferences: NotificationPreferences = {
  slaBreachEmail: true,
  criticalTicketEmail: true,
  churnRiskInApp: true,
};

export const slaPolicyResponseSchema = z.object({
  data: slaPolicySchema,
});

export const smtpSettingsResponseSchema = z.object({
  data: smtpSettingsSchema,
});

export const notificationPreferencesResponseSchema = z.object({
  data: notificationPreferencesSchema,
});

export const testSmtpBodySchema = z.object({
  toEmail: z.string().email().optional(),
});

export type TestSmtpBody = z.infer<typeof testSmtpBodySchema>;

export const testSmtpResponseSchema = z.object({
  data: z.object({ ok: z.literal(true) }),
});

/** ruleType keys in support_notification_rules for org settings. */
export const orgSettingRuleTypeSchema = z.enum(['sla_policy', 'smtp', 'preferences']);

export type OrgSettingRuleType = z.infer<typeof orgSettingRuleTypeSchema>;

/** Validates priority keys match ticket priorities. */
export const slaPolicyKeysSchema = z.record(ticketPrioritySchema, z.number().positive());
