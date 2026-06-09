import type { TicketApiDto } from '@usd/shared-types';

/**
 * Returns true when the ticket description should appear in the conversation thread.
 */
export function hasDisplayableDescription(description: string | undefined): boolean {
  if (description === undefined) {
    return false;
  }
  const trimmed = description.trim();
  return trimmed.length > 0 && trimmed !== '—';
}

/**
 * Thread label for the ticket's original description by source system.
 */
export function originalDescriptionLabel(source: TicketApiDto['source']): string {
  return source === 'helpdesk' ? 'Original Request' : 'Issue Description';
}

const THREAD_PREVIEW_MAX_LEN = 80;

/**
 * Short single-line preview for collapsed conversation rows.
 */
export function conversationBodyPreview(body: string, maxLen = THREAD_PREVIEW_MAX_LEN): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLen) {
    return flat;
  }
  return `${flat.slice(0, maxLen)}…`;
}

/**
 * Picks the thread row id (description or comment) with the latest createdAt.
 */
export function newestThreadRowId(
  descriptionEntries: readonly TicketApiDto[],
  comments: readonly { commentId: string; createdAt: string }[],
): string | undefined {
  const rows: { id: string; createdAt: string }[] = [];
  for (const entry of descriptionEntries) {
    rows.push({ id: `desc-${entry.ticketId}`, createdAt: entry.createdAt });
  }
  for (const comment of comments) {
    rows.push({ id: comment.commentId, createdAt: comment.createdAt });
  }
  if (rows.length === 0) {
    return undefined;
  }
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return rows[rows.length - 1]?.id;
}

/**
 * Formats an ISO timestamp for display in the conversation thread (stable en-US locale).
 */
export function formatTicketTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
