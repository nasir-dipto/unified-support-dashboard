import {
  notificationPreferencesResponseSchema,
  notificationPreferencesSchema,
  slaPolicyResponseSchema,
  slaPolicySchema,
  smtpSettingsResponseSchema,
  smtpSettingsSchema,
  type NotificationPreferences,
  type SlaPolicy,
  type SmtpSettings,
} from '@usd/shared-types';
import { apiClient } from './client';

/**
 * Loads org SLA policy.
 */
export async function fetchSlaPolicy(): Promise<SlaPolicy> {
  const res = await apiClient.get('/api/settings/sla');
  return slaPolicyResponseSchema.parse(res.data).data;
}

/**
 * Saves org SLA policy.
 */
export async function saveSlaPolicy(policy: SlaPolicy): Promise<SlaPolicy> {
  const body = slaPolicySchema.parse(policy);
  const res = await apiClient.put('/api/settings/sla', body);
  return slaPolicyResponseSchema.parse(res.data).data;
}

/**
 * Loads SMTP settings (404 when unset).
 */
export async function fetchSmtpSettings(): Promise<SmtpSettings | null> {
  try {
    const res = await apiClient.get('/api/settings/smtp');
    return smtpSettingsResponseSchema.parse(res.data).data;
  } catch {
    return null;
  }
}

/**
 * Saves SMTP settings.
 */
export async function saveSmtpSettings(settings: SmtpSettings): Promise<SmtpSettings> {
  const body = smtpSettingsSchema.parse(settings);
  const res = await apiClient.put('/api/settings/smtp', body);
  return smtpSettingsResponseSchema.parse(res.data).data;
}

/**
 * Sends SMTP test email.
 */
export async function testSmtp(toEmail?: string): Promise<void> {
  await apiClient.post('/api/settings/smtp/test', toEmail !== undefined ? { toEmail } : {});
}

/**
 * Loads notification preferences.
 */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiClient.get('/api/settings/preferences');
  return notificationPreferencesResponseSchema.parse(res.data).data;
}

/**
 * Saves notification preferences.
 */
export async function saveNotificationPreferences(
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  const body = notificationPreferencesSchema.parse(prefs);
  const res = await apiClient.put('/api/settings/preferences', body);
  return notificationPreferencesResponseSchema.parse(res.data).data;
}
