import type { TicketApiDto } from '@usd/shared-types';
import { statusColors, usdColors } from '@usd/ui';

const MS_PER_DAY = 86_400_000;
const DEFAULT_SLA_DAYS = 7;

/**
 * Estimates SLA remaining % from created/updated timestamps (heuristic when API has no SLA).
 */
export function estimateSlaPercentRemaining(
  createdAt: string,
  updatedAt: string,
  nowMs: number = Date.now(),
): number {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) {
    return 75;
  }
  const deadline = created + DEFAULT_SLA_DAYS * MS_PER_DAY;
  const elapsed = Math.max(0, nowMs - updated);
  const totalWindow = Math.max(MS_PER_DAY, deadline - updated);
  const remaining = Math.max(0, 1 - elapsed / totalWindow);
  return Math.round(remaining * 100);
}

/**
 * Human-readable status label.
 */
export function formatStatusLabel(status: TicketApiDto['status']): string {
  return status.replace(/_/g, ' ');
}

/**
 * Display colour for ticket status.
 */
export function statusColor(status: TicketApiDto['status']): string {
  return statusColors[status] ?? usdColors.gray;
}

/**
 * Assignee display — falls back to id or Unassigned.
 */
export function formatAssignee(assigneeId: string | undefined): string {
  if (assigneeId === undefined || assigneeId.trim().length === 0) {
    return 'Unassigned';
  }
  return assigneeId;
}

/**
 * Ticket id shown on cards — Jira issue key or `HD-{displayId}` for Helpdesk.
 */
export function formatTicketDisplayId(ticket: TicketApiDto): string {
  if (ticket.source === 'jira') {
    return ticket.externalId;
  }
  const displayId = ticket.externalId.trim();
  return displayId.length > 0 ? `HD-${displayId}` : '—';
}

/**
 * Customer label for helpdesk tickets.
 */
export function formatCustomer(ticket: TicketApiDto): string {
  if (ticket.customerEmail !== undefined && ticket.customerEmail.length > 0) {
    return ticket.customerEmail;
  }
  return '—';
}

/**
 * External URL to open ticket in source system (best-effort).
 */
function envString(key: string): string | undefined {
  const raw: unknown = import.meta.env[key];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

/**
 * External URL to open ticket in source system (best-effort).
 */
export function ticketExternalUrl(ticket: TicketApiDto): string | undefined {
  const jiraBase = envString('VITE_JIRA_BROWSE_URL');
  if (ticket.source === 'jira') {
    if (jiraBase !== undefined) {
      return `${jiraBase.replace(/\/$/, '')}/${ticket.externalId}`;
    }
    return undefined;
  }
  const hdBase = envString('VITE_HELPDESK_PORTAL_URL');
  if (hdBase !== undefined) {
    return `${hdBase.replace(/\/$/, '')}/${ticket.externalId}`;
  }
  return undefined;
}

/**
 * Source accent colour (Jira blue, Helpdesk purple).
 */
export function sourceAccentColor(source: TicketApiDto['source']): string {
  return source === 'jira' ? usdColors.blue : usdColors.purple;
}
