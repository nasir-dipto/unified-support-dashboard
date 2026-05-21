import type { AuthUserPublic, TicketApiDto } from '@usd/shared-types';
import { statusColors, usdColors } from '@usd/ui';

export type SlaEstimateOptions = {
  /** ISO due date from source system; when absent, SLA is unknown */
  dueAt?: string | null;
  nowMs?: number;
};

/**
 * Returns SLA remaining % when `dueAt` is known; otherwise `null` (no heuristic default).
 */
export function estimateSlaPercentRemaining(
  createdAt: string,
  _updatedAt: string,
  options?: SlaEstimateOptions,
): number | null {
  const dueAt = options?.dueAt?.trim();
  if (dueAt === undefined || dueAt.length === 0) {
    return null;
  }
  const due = new Date(dueAt).getTime();
  const created = new Date(createdAt).getTime();
  const nowMs = options?.nowMs ?? Date.now();
  if (Number.isNaN(due) || Number.isNaN(created)) {
    return null;
  }
  const windowMs = due - created;
  if (windowMs <= 0) {
    return null;
  }
  const remaining = due - nowMs;
  return Math.round(Math.max(0, Math.min(100, (remaining / windowMs) * 100)));
}

/**
 * Average SLA % across tickets that have a known due date.
 */
export function averageSlaPercentRemaining(tickets: TicketApiDto[]): number | null {
  const values = tickets
    .map((t) =>
      estimateSlaPercentRemaining(t.createdAt, t.updatedAt, {
        dueAt: (t as TicketApiDto & { slaDueAt?: string }).slaDueAt,
      }),
    )
    .filter((v): v is number => v !== null);
  if (values.length === 0) {
    return null;
  }
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Whether a ticket is assigned to the signed-in USD user (matches id or email).
 */
export function isTicketAssignedToCurrentUser(
  ticket: TicketApiDto,
  user: AuthUserPublic | null | undefined,
): boolean {
  if (user === null || user === undefined) {
    return false;
  }
  const assignee = ticket.assigneeId?.trim();
  if (assignee === undefined || assignee.length === 0) {
    return false;
  }
  if (assignee === user.userId || assignee === user.email) {
    return true;
  }
  const localPart = user.email.split('@')[0]?.toLowerCase();
  return (
    localPart !== undefined &&
    localPart.length > 0 &&
    assignee.toLowerCase().includes(localPart)
  );
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
