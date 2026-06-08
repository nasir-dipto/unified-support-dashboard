import type { CommentSource, TicketApiDto, WsOutboundEnvelope } from '@usd/shared-types';
import { formatTicketDisplayId } from './ticket-display.js';

type TicketSource = TicketApiDto['source'];

/** Partial ticket snapshot nested in WS activity payloads. */
export type ActivityTicketSnapshot = Partial<
  Pick<
    TicketApiDto,
    | 'source'
    | 'externalId'
    | 'summary'
    | 'priority'
    | 'status'
    | 'assigneeId'
    | 'reporterId'
    | 'customerEmail'
    | 'updatedAt'
    | 'sentiment'
    | 'churnRisk'
  >
>;

/** Client-side source filter for the activity feed. */
export type ActivitySourceFilter = 'all' | 'jira' | 'me';

const TERMINAL_STATUSES = new Set<TicketApiDto['status']>(['resolved', 'closed']);

/**
 * Reads a string field from an event payload when present.
 */
function payloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const raw = payload[key];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
}

/**
 * Parses the ticket snapshot from a WebSocket activity envelope payload.
 */
export function parseActivityTicketSnapshot(
  event: WsOutboundEnvelope,
): ActivityTicketSnapshot | undefined {
  const ticket = event.payload['ticket'];
  if (ticket === undefined || typeof ticket !== 'object' || ticket === null) {
    return undefined;
  }
  const row = ticket as Record<string, unknown>;
  const source = row['source'];
  const externalId = row['externalId'];
  const summary = row['summary'];
  const priority = row['priority'];
  const status = row['status'];
  const assigneeId = row['assigneeId'];
  const reporterId = row['reporterId'];
  const customerEmail = row['customerEmail'];
  const updatedAt = row['updatedAt'];
  const sentiment = row['sentiment'];
  const churnRisk = row['churnRisk'];

  const snapshot: ActivityTicketSnapshot = {};
  if (source === 'jira' || source === 'helpdesk') {
    snapshot.source = source;
  }
  if (typeof externalId === 'string') {
    snapshot.externalId = externalId;
  }
  if (typeof summary === 'string') {
    snapshot.summary = summary;
  }
  if (priority === 'critical' || priority === 'high' || priority === 'medium' || priority === 'low') {
    snapshot.priority = priority;
  }
  if (
    status === 'open' ||
    status === 'in_progress' ||
    status === 'pending' ||
    status === 'resolved' ||
    status === 'closed'
  ) {
    snapshot.status = status;
  }
  if (typeof assigneeId === 'string') {
    snapshot.assigneeId = assigneeId;
  }
  if (typeof reporterId === 'string') {
    snapshot.reporterId = reporterId;
  }
  if (typeof customerEmail === 'string') {
    snapshot.customerEmail = customerEmail;
  }
  if (typeof updatedAt === 'string') {
    snapshot.updatedAt = updatedAt;
  }
  if (sentiment === 'positive' || sentiment === 'neutral' || sentiment === 'negative') {
    snapshot.sentiment = sentiment;
  }
  if (typeof churnRisk === 'boolean') {
    snapshot.churnRisk = churnRisk;
  }

  return Object.keys(snapshot).length > 0 ? snapshot : undefined;
}

/**
 * Resolves ticket source from payload snapshot or internal ticket id prefix.
 */
export function getActivityEventSource(event: WsOutboundEnvelope): TicketSource | undefined {
  const ticket = parseActivityTicketSnapshot(event);
  if (ticket?.source !== undefined) {
    return ticket.source;
  }
  if (event.ticketId.startsWith('jira_')) {
    return 'jira';
  }
  if (event.ticketId.startsWith('hd_')) {
    return 'helpdesk';
  }
  return undefined;
}

/**
 * Formats a user-facing ticket id for activity entries (Jira key or HD-{displayId}).
 */
export function formatActivityTicketDisplayId(
  event: WsOutboundEnvelope,
  ticket?: ActivityTicketSnapshot,
): string {
  const snapshot = ticket ?? parseActivityTicketSnapshot(event);
  if (
    snapshot !== undefined &&
    snapshot.source !== undefined &&
    snapshot.externalId !== undefined
  ) {
    return formatTicketDisplayId({
      source: snapshot.source,
      externalId: snapshot.externalId,
    } as TicketApiDto);
  }
  if (event.ticketId.startsWith('hd_')) {
    const displayId = event.ticketId.slice(3);
    return displayId.length > 0 ? `HD-${displayId}` : event.ticketId;
  }
  if (event.ticketId.startsWith('jira_')) {
    const key = event.ticketId.slice(5);
    return key.length > 0 ? key : event.ticketId;
  }
  return event.ticketId;
}

/**
 * Returns a compact relative time label (e.g. "5 min ago", "2d ago").
 */
export function formatTimeAgo(iso: string, nowMs: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 60) {
    return 'just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${String(diffMin)} min ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${String(diffHr)}h ago`;
  }
  const diffDay = Math.floor(diffHr / 24);
  return `${String(diffDay)}d ago`;
}

/**
 * ISO timestamp used for the entry time-ago label.
 */
export function getActivityEventTimestamp(event: WsOutboundEnvelope): string | undefined {
  const ticket = parseActivityTicketSnapshot(event);
  if (ticket?.updatedAt !== undefined) {
    return ticket.updatedAt;
  }
  return payloadString(event.payload, 'createdAt');
}

/**
 * Returns true when a comment_added author is the customer/requester.
 */
export function isCustomerCommentAuthor(
  event: WsOutboundEnvelope,
  ticket?: ActivityTicketSnapshot,
): boolean {
  if (event.type !== 'comment_added') {
    return false;
  }
  const commentSource = payloadString(event.payload, 'commentSource') as CommentSource | undefined;
  if (commentSource === 'hd_email') {
    return true;
  }
  const authorEmail = payloadString(event.payload, 'authorEmail')?.toLowerCase();
  if (authorEmail === undefined) {
    return false;
  }
  const snapshot = ticket ?? parseActivityTicketSnapshot(event);
  const customerEmail = snapshot?.customerEmail?.trim().toLowerCase();
  if (customerEmail !== undefined && customerEmail.length > 0 && authorEmail === customerEmail) {
    return true;
  }
  const reporterId = snapshot?.reporterId?.trim().toLowerCase();
  if (reporterId !== undefined && reporterId.length > 0 && authorEmail === reporterId) {
    return true;
  }
  return false;
}

/**
 * Attribution line for an activity entry, or null when unknown.
 */
export function getActivityEventAttribution(event: WsOutboundEnvelope): string | null {
  const ticket = parseActivityTicketSnapshot(event);

  if (event.type === 'comment_added') {
    const authorEmail = payloadString(event.payload, 'authorEmail');
    const authorUserId = payloadString(event.payload, 'authorUserId');
    const name = authorEmail ?? authorUserId;
    if (name === undefined) {
      return null;
    }
    if (isCustomerCommentAuthor(event, ticket)) {
      return `by ${name} (Customer)`;
    }
    return `by ${name}`;
  }

  if (
    event.type === 'ticket_updated' ||
    event.type === 'ticket_created' ||
    event.type === 'ticket_resolved'
  ) {
    const assignee = ticket?.assigneeId?.trim();
    if (assignee !== undefined && assignee.length > 0) {
      return `by ${assignee}`;
    }
  }

  return null;
}

/**
 * Primary summary text for an activity entry.
 */
export function getActivityEventSummary(event: WsOutboundEnvelope): string {
  const ticket = parseActivityTicketSnapshot(event);
  if (ticket?.summary !== undefined && ticket.summary.trim().length > 0) {
    return ticket.summary;
  }
  if (event.type === 'comment_added') {
    const body = payloadString(event.payload, 'body');
    if (body !== undefined) {
      return body.length > 120 ? `${body.slice(0, 120)}…` : body;
    }
    return 'New comment';
  }
  return event.type.replace(/_/g, ' ');
}

/**
 * Returns true when the entry should show an Action required badge.
 */
export function isActionRequired(event: WsOutboundEnvelope): boolean {
  const ticket = parseActivityTicketSnapshot(event);
  const status = ticket?.status;
  if (status !== undefined && TERMINAL_STATUSES.has(status)) {
    return false;
  }

  const priority = ticket?.priority;
  if (
    (priority === 'high' || priority === 'critical') &&
    (status === undefined || !TERMINAL_STATUSES.has(status))
  ) {
    return true;
  }

  if (ticket?.sentiment === 'negative' || ticket?.churnRisk === true) {
    return true;
  }

  if (event.type === 'comment_added' && isCustomerCommentAuthor(event, ticket)) {
    return true;
  }

  return false;
}

/**
 * Counts entries that require technician action.
 */
export function countActionRequired(events: WsOutboundEnvelope[]): number {
  return events.filter(isActionRequired).length;
}

/**
 * Filters activity events by ticket source (client-side).
 */
export function filterActivityEventsBySource(
  events: WsOutboundEnvelope[],
  filter: ActivitySourceFilter,
): WsOutboundEnvelope[] {
  if (filter === 'all') {
    return events;
  }
  return events.filter((event) => {
    const source = getActivityEventSource(event);
    if (filter === 'jira') {
      return source === 'jira';
    }
    return source === 'helpdesk';
  });
}
