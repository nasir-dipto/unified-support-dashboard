import type { SlaPolicy, SupportTicketRecord, TicketApiDto, TicketPriority } from '@usd/shared-types';
import { defaultSlaPolicy } from '@usd/shared-types';

/**
 * Computes SLA due timestamp from ticket creation and org policy hours.
 */
export function computeSlaDueAtFromPolicy(
  createdAt: string,
  priority: TicketPriority,
  policy: SlaPolicy = defaultSlaPolicy,
): string {
  const hours = policy[priority];
  const createdMs = new Date(createdAt).getTime();
  return new Date(createdMs + hours * 60 * 60 * 1000).toISOString();
}

/**
 * Resolves effective SLA due date: explicit field on record or policy-based fallback.
 */
export function resolveSlaDueAt(
  record: SupportTicketRecord,
  policy: SlaPolicy = defaultSlaPolicy,
): string {
  const explicit = record.slaDueAt?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }
  return computeSlaDueAtFromPolicy(record.createdAt, record.priority, policy);
}

/**
 * Returns SLA remaining percent (0–100) for breach detection; null when invalid.
 */
export function estimateSlaPercentRemaining(
  createdAt: string,
  dueAt: string,
  nowMs: number = Date.now(),
): number | null {
  const due = new Date(dueAt).getTime();
  const created = new Date(createdAt).getTime();
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
 * True when an open ticket is under 25% SLA remaining (breach risk).
 */
export function isSlaBreachRisk(
  record: SupportTicketRecord,
  policy: SlaPolicy = defaultSlaPolicy,
  nowMs: number = Date.now(),
): boolean {
  if (record.status === 'resolved' || record.status === 'closed') {
    return false;
  }
  const dueAt = resolveSlaDueAt(record, policy);
  const pct = estimateSlaPercentRemaining(record.createdAt, dueAt, nowMs);
  return pct !== null && pct < 25;
}

/**
 * Maps a stored ticket to API DTO with computed `slaDueAt`.
 */
export function toTicketApiDto(record: SupportTicketRecord, policy: SlaPolicy): TicketApiDto {
  const slaDueAt = resolveSlaDueAt(record, policy);
  return {
    ticketId: record.ticketId,
    orgId: record.orgId,
    source: record.source,
    externalId: record.externalId,
    internalId: record.internalId,
    summary: record.summary,
    description: record.description,
    priority: record.priority,
    status: record.status,
    assigneeId: record.assigneeId,
    reporterId: record.reporterId,
    customerEmail: record.customerEmail,
    linkedTicketId: record.linkedTicketId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sentiment: record.sentiment,
    sentimentScore: record.sentimentScore,
    churnRisk: record.churnRisk,
    sentimentStale: record.sentimentStale,
    sentimentAt: record.sentimentAt,
    slaDueAt,
  };
}
