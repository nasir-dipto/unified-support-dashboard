import type { TicketApiDto, TicketCommentApiDto } from '@usd/shared-types';
import type { AiTicketContext } from './types.js';

/**
 * Formats one ticket as plain text for inclusion in an AI prompt.
 */
function formatTicketBlock(ticket: TicketApiDto, label: string): string {
  const lines = [
    `[${label}]`,
    `ticketId: ${ticket.ticketId}`,
    `source: ${ticket.source}`,
    `externalId: ${ticket.externalId}`,
    `summary: ${ticket.summary}`,
    `priority: ${ticket.priority}`,
    `status: ${ticket.status}`,
    `assignee: ${ticket.assigneeId ?? 'unassigned'}`,
    `customer: ${ticket.customerEmail ?? ticket.reporterId ?? 'unknown'}`,
    `createdAt: ${ticket.createdAt}`,
    `updatedAt: ${ticket.updatedAt}`,
  ];
  if (ticket.slaDueAt !== undefined && ticket.slaDueAt.trim().length > 0) {
    lines.push(`slaDueAt: ${ticket.slaDueAt}`);
  }
  if (ticket.description !== undefined && ticket.description.trim().length > 0) {
    lines.push(`description: ${ticket.description.trim()}`);
  }
  if (ticket.linkedTicketId !== undefined) {
    lines.push(`linkedTicketId: ${ticket.linkedTicketId}`);
  }
  return lines.join('\n');
}

/**
 * Formats conversation comments oldest-first for the prompt.
 */
function formatCommentsBlock(comments: TicketCommentApiDto[], label: string): string {
  if (comments.length === 0) {
    return `[${label} — conversation]\n(no messages)`;
  }
  const rows = comments.map((c, i) => {
    const author = c.authorDisplayName ?? c.authorEmail ?? 'unknown';
    return `${String(i + 1)}. [${c.commentSource}] ${c.createdAt} — ${author}: ${c.body}`;
  });
  return [`[${label} — conversation]`, ...rows].join('\n');
}

/**
 * Serializes full AI context (primary ticket, thread, optional linked ticket) to prompt text.
 */
export function formatContextForPrompt(ctx: AiTicketContext): string {
  const parts = [
    formatTicketBlock(ctx.ticket, 'Primary ticket'),
    formatCommentsBlock(ctx.comments, 'Primary'),
  ];
  if (ctx.linked !== undefined) {
    parts.push('');
    parts.push(formatTicketBlock(ctx.linked.ticket, 'Linked ticket'));
    parts.push(formatCommentsBlock(ctx.linked.comments, 'Linked'));
  }
  return parts.join('\n');
}
