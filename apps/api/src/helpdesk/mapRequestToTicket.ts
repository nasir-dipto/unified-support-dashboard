import type { SdpRequest, SupportTicketRecord, TicketPriority, TicketStatus } from '@usd/shared-types';
import { sdpRequestSchema, ticketPrioritySchema, ticketStatusSchema } from '@usd/shared-types';
import { hdTimestampToIso } from '../utils/sourceTimestamps.js';

/**
 * Maps Helpdesk priority label to USD enum.
 */
export function mapHdPriorityName(name: string | undefined): TicketPriority {
  const n = (name ?? '').toLowerCase();
  if (
    n.includes('urgent') ||
    n.includes('critical') ||
    n.includes('blocker') ||
    n.includes('highest')
  ) {
    return 'critical';
  }
  if (n.includes('high')) {
    return 'high';
  }
  if (n.includes('low')) {
    return 'low';
  }
  return 'medium';
}

/**
 * Maps Helpdesk status label to USD enum (`On Hold` → `pending`).
 */
export function mapHdStatusName(name: string | undefined): TicketStatus {
  const n = (name ?? '').toLowerCase();
  if (n.includes('hold') || n.includes('pending') || n.includes('awaiting')) {
    return 'pending';
  }
  if (n.includes('done') || n.includes('closed') || n.includes('complete')) {
    return 'closed';
  }
  if (n.includes('resolved')) {
    return 'resolved';
  }
  if (n.includes('progress') || n.includes('work in') || n.includes('assigned')) {
    return 'in_progress';
  }
  return 'open';
}

/**
 * Normalizes Helpdesk description (string or rich object) to plain text / JSON string.
 */
export function normalizeHdDescription(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw === 'string') {
    return raw.length > 0 ? raw : undefined;
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return undefined;
  }
}

export type MapHdRequestInput = {
  request: SdpRequest | Record<string, unknown>;
  orgId: string;
  nowIso?: string;
};

/**
 * Builds a `support_tickets` item from an SDP request.
 * `ticketId` / `externalId` use `display_id.value`; `internalId` stores SDP `id` for REST calls.
 */
export function mapHdRequestToTicket(input: MapHdRequestInput): SupportTicketRecord {
  const req = sdpRequestSchema.parse(input.request);
  const orgId = input.orgId;
  const now = input.nowIso ?? new Date().toISOString();
  const externalDisplayId = req.display_id.value;
  const internalId = req.id;
  const summary = (req.subject != null && req.subject.length > 0 ? req.subject : null) ?? '(no subject)';
  const priority = ticketPrioritySchema.parse(mapHdPriorityName(req.priority?.name ?? undefined));
  const status = ticketStatusSchema.parse(mapHdStatusName(req.status?.name ?? undefined));
  const techName = req.technician?.name;
  const assigneeId =
    techName != null && typeof techName === 'string' && techName.length > 0 ? techName : undefined;
  const emailRaw = req.requester?.email_id;
  const customerEmail =
    emailRaw != null && typeof emailRaw === 'string' && emailRaw.length > 0 ? emailRaw : undefined;
  const reporterId =
    customerEmail !== undefined
      ? customerEmail
      : (() => {
          const r = req.requester;
          const name = r?.name;
          return name != null && typeof name === 'string' && name.length > 0 ? name : undefined;
        })();
  const reqRaw = req as Record<string, unknown>;
  const createdAt = hdTimestampToIso(reqRaw.created_time, now);
  const updatedAt = hdTimestampToIso(reqRaw.updated_time, now);
  return {
    ticketId: `hd_${externalDisplayId}`,
    orgId,
    source: 'helpdesk',
    externalId: externalDisplayId,
    internalId,
    summary,
    description: normalizeHdDescription(req.description),
    priority,
    status,
    assigneeId,
    reporterId,
    customerEmail,
    createdAt,
    updatedAt,
  };
}
