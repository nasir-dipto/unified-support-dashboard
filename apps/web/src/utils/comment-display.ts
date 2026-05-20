import type { CommentSource, TicketCommentApiDto } from '@usd/shared-types';
import { usdColors } from '@usd/ui';

/** Human-readable label for a comment source in the conversation thread. */
export function commentSourceLabel(source: CommentSource): string {
  switch (source) {
    case 'jira_comment':
      return 'Jira comment';
    case 'hd_note':
      return 'Internal note';
    case 'hd_email':
      return 'Customer email';
    case 'usd_comment':
      return 'USD comment';
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

/** Badge color per comment source. */
export function commentSourceColor(source: CommentSource): string {
  switch (source) {
    case 'jira_comment':
      return usdColors.blue;
    case 'hd_note':
      return usdColors.purple;
    case 'hd_email':
      return usdColors.teal;
    case 'usd_comment':
      return usdColors.indigo;
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

/**
 * Sorts thread comments oldest-first by `createdAt`.
 */
export function sortThreadComments(comments: TicketCommentApiDto[]): TicketCommentApiDto[] {
  return [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Tooltip when HD customer email replies are disabled. */
export const HD_EMAIL_REPLY_DISABLED_TOOLTIP =
  'Configure mail server in HD settings to enable customer email replies.';
