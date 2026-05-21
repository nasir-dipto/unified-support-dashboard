import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  defaultNotificationPreferences,
  defaultSlaPolicy,
  notificationPreferencesSchema,
  slaPolicySchema,
  smtpSettingsSchema,
  type NotificationPreferences,
  type SlaPolicy,
  type SmtpSettings,
} from '@usd/shared-types';
import { getServerEnv } from '../../config/loadEnv.js';
import { getDocumentClient } from '../dynamo.client.js';

const RULE_SLA = 'sla_policy';
const RULE_SMTP = 'smtp';
const RULE_PREFS = 'preferences';

/**
 * Loads org SLA policy from DynamoDB or returns defaults.
 */
export async function getOrgSlaPolicy(orgId: string): Promise<SlaPolicy> {
  const raw = await getRulePayload(orgId, RULE_SLA);
  if (raw === undefined) {
    return defaultSlaPolicy;
  }
  const parsed = slaPolicySchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultSlaPolicy;
}

/**
 * Persists org SLA policy.
 */
export async function putOrgSlaPolicy(orgId: string, policy: SlaPolicy): Promise<SlaPolicy> {
  const parsed = slaPolicySchema.parse(policy);
  await putRulePayload(orgId, RULE_SLA, parsed);
  return parsed;
}

/**
 * Loads SMTP settings when configured.
 */
export async function getOrgSmtpSettings(orgId: string): Promise<SmtpSettings | undefined> {
  const raw = await getRulePayload(orgId, RULE_SMTP);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = smtpSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Saves SMTP settings for an org.
 */
export async function putOrgSmtpSettings(orgId: string, settings: SmtpSettings): Promise<SmtpSettings> {
  const parsed = smtpSettingsSchema.parse(settings);
  await putRulePayload(orgId, RULE_SMTP, parsed);
  return parsed;
}

/**
 * Loads notification preferences or defaults.
 */
export async function getOrgNotificationPreferences(
  orgId: string,
): Promise<NotificationPreferences> {
  const raw = await getRulePayload(orgId, RULE_PREFS);
  if (raw === undefined) {
    return defaultNotificationPreferences;
  }
  const parsed = notificationPreferencesSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultNotificationPreferences;
}

/**
 * Saves notification preferences.
 */
export async function putOrgNotificationPreferences(
  orgId: string,
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  const parsed = notificationPreferencesSchema.parse(prefs);
  await putRulePayload(orgId, RULE_PREFS, parsed);
  return parsed;
}

/**
 * Seeds default SLA and preferences for a new org (idempotent).
 */
export async function seedOrgSettingsDefaults(orgId: string): Promise<void> {
  const existing = await getRulePayload(orgId, RULE_SLA);
  if (existing === undefined) {
    await putRulePayload(orgId, RULE_SLA, defaultSlaPolicy);
  }
  const prefs = await getRulePayload(orgId, RULE_PREFS);
  if (prefs === undefined) {
    await putRulePayload(orgId, RULE_PREFS, defaultNotificationPreferences);
  }
}

async function getRulePayload(
  orgId: string,
  ruleType: string,
): Promise<Record<string, unknown> | undefined> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_NOTIFICATION_RULES_TABLE,
      Key: { orgId, ruleType },
    }),
  );
  const item = out.Item as { payload?: Record<string, unknown> } | undefined;
  return item?.payload;
}

async function putRulePayload(
  orgId: string,
  ruleType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_NOTIFICATION_RULES_TABLE,
      Item: {
        orgId,
        ruleType,
        payload,
        updatedAt: new Date().toISOString(),
      },
    }),
  );
}
