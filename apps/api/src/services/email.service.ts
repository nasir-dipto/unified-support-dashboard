import nodemailer from 'nodemailer';
import type { SmtpSettings } from '@usd/shared-types';
import { AppError } from '../utils/errors.js';

/**
 * Sends a test email using org SMTP settings (Mailhog in local dev).
 */
export async function sendTestEmail(
  settings: SmtpSettings,
  toEmail: string,
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth:
      settings.user !== undefined && settings.password !== undefined
        ? { user: settings.user, pass: settings.password }
        : undefined,
  });
  try {
    await transport.sendMail({
      from:
        settings.fromName !== undefined
          ? `"${settings.fromName}" <${settings.fromEmail}>`
          : settings.fromEmail,
      to: toEmail,
      subject: 'USD SMTP test',
      text: 'Unified Support Dashboard SMTP configuration is working.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'SMTP send failed';
    throw new AppError(msg, 'SMTP_ERROR', 502);
  }
}

/**
 * Sends a notification email when SMTP is configured.
 */
export async function sendNotificationEmail(params: {
  settings: SmtpSettings;
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const transport = nodemailer.createTransport({
    host: params.settings.host,
    port: params.settings.port,
    secure: params.settings.secure,
    auth:
      params.settings.user !== undefined && params.settings.password !== undefined
        ? { user: params.settings.user, pass: params.settings.password }
        : undefined,
  });
  try {
    await transport.sendMail({
      from:
        params.settings.fromName !== undefined
          ? `"${params.settings.fromName}" <${params.settings.fromEmail}>`
          : params.settings.fromEmail,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
  } catch {
    // email is best-effort; do not fail the caller
  }
}
