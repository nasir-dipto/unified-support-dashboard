import type { NotificationRecord, SupportTicketRecord } from '@usd/shared-types';
import { createNotification, listNotifications, markNotificationRead } from '../db/tables/notifications.js';
import {
  getOrgNotificationPreferences,
  getOrgSlaPolicy,
  getOrgSmtpSettings,
} from '../db/tables/org-settings.js';
import { isSlaBreachRisk } from '../utils/sla.js';
import { broadcastWsEnvelope } from './websocket.service.js';
import { sendNotificationEmail } from './email.service.js';

const recentKeys = new Map<string, number>();
const DEDUPE_MS = 60 * 60 * 1000;

function dedupeKey(orgId: string, type: string, ticketId: string): string {
  return `${orgId}:${type}:${ticketId}`;
}

function shouldEmit(orgId: string, type: string, ticketId: string): boolean {
  const key = dedupeKey(orgId, type, ticketId);
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last !== undefined && now - last < DEDUPE_MS) {
    return false;
  }
  recentKeys.set(key, now);
  return true;
}

/**
 * Clears dedupe map (Vitest only).
 */
export function resetNotificationDedupeForTests(): void {
  recentKeys.clear();
}

/**
 * Lists in-app notifications for an org.
 */
export async function getNotificationsForOrg(orgId: string) {
  return listNotifications(orgId);
}

/**
 * Marks a notification read and returns the updated row.
 */
export async function markRead(orgId: string, notificationId: string) {
  return markNotificationRead(orgId, notificationId);
}

function publishNotification(record: NotificationRecord): NotificationRecord {
  broadcastWsEnvelope({
    type: 'notification_created',
    orgId: record.orgId,
    ticketId: record.ticketId ?? record.notificationId,
    payload: { notification: record },
  });
  return record;
}

/**
 * Creates SLA breach risk notification (in-app + optional email).
 */
export async function notifySlaBreachIfNeeded(
  orgId: string,
  ticket: SupportTicketRecord,
): Promise<void> {
  if (!shouldEmit(orgId, 'sla_breach', ticket.ticketId)) {
    return;
  }
  const policy = await getOrgSlaPolicy(orgId);
  if (!isSlaBreachRisk(ticket, policy)) {
    return;
  }
  const prefs = await getOrgNotificationPreferences(orgId);
  const record = await createNotification({
    orgId,
    type: 'sla_breach',
    title: 'SLA breach risk',
    message: `${ticket.externalId}: ${ticket.summary} is under 25% SLA remaining.`,
    ticketId: ticket.ticketId,
  });
  publishNotification(record);
  if (prefs.slaBreachEmail) {
    const smtp = await getOrgSmtpSettings(orgId);
    const email = ticket.assigneeId;
    if (smtp !== undefined && email !== undefined && email.includes('@')) {
      await sendNotificationEmail({
        settings: smtp,
        to: email,
        subject: record.title,
        text: record.message,
      });
    }
  }
}

/**
 * Creates critical ticket notification on create or priority escalation.
 */
export async function notifyCriticalTicketIfNeeded(
  orgId: string,
  previous: SupportTicketRecord | undefined,
  merged: SupportTicketRecord,
): Promise<void> {
  if (merged.priority !== 'critical') {
    return;
  }
  const isNew = previous === undefined;
  const escalated = previous !== undefined && previous.priority !== 'critical';
  if (!isNew && !escalated) {
    return;
  }
  if (!shouldEmit(orgId, 'critical_ticket', merged.ticketId)) {
    return;
  }
  const prefs = await getOrgNotificationPreferences(orgId);
  const record = await createNotification({
    orgId,
    type: 'critical_ticket',
    title: 'Critical ticket',
    message: `${merged.externalId}: ${merged.summary}`,
    ticketId: merged.ticketId,
  });
  publishNotification(record);
  if (prefs.criticalTicketEmail) {
    const smtp = await getOrgSmtpSettings(orgId);
    const email = merged.assigneeId;
    if (smtp !== undefined && email !== undefined && email.includes('@')) {
      await sendNotificationEmail({
        settings: smtp,
        to: email,
        subject: record.title,
        text: record.message,
      });
    }
  }
}

/**
 * Creates churn-risk in-app notification after sentiment analysis.
 */
export async function notifyChurnRiskIfNeeded(
  orgId: string,
  ticket: SupportTicketRecord,
  churnRisk: boolean,
): Promise<void> {
  if (!churnRisk || ticket.source !== 'helpdesk') {
    return;
  }
  const prefs = await getOrgNotificationPreferences(orgId);
  if (!prefs.churnRiskInApp) {
    return;
  }
  if (!shouldEmit(orgId, 'churn_risk', ticket.ticketId)) {
    return;
  }
  const record = await createNotification({
    orgId,
    type: 'churn_risk',
    title: 'Churn risk detected',
    message: `${ticket.externalId}: customer sentiment indicates churn risk.`,
    ticketId: ticket.ticketId,
  });
  publishNotification(record);
}

/**
 * Scans open tickets for SLA breach risk after sync.
 */
export async function scanSlaBreachesForOrg(orgId: string): Promise<number> {
  const { listAllTicketsForOrg } = await import('../db/tables/tickets.js');
  const tickets = await listAllTicketsForOrg(orgId);
  let count = 0;
  for (const t of tickets) {
    if (t.status === 'resolved' || t.status === 'closed') {
      continue;
    }
    const policy = await getOrgSlaPolicy(orgId);
    if (isSlaBreachRisk(t, policy)) {
      await notifySlaBreachIfNeeded(orgId, t);
      count += 1;
    }
  }
  return count;
}
