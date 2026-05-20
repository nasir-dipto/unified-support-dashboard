import type { CommentSource, SupportTicketCommentRecord } from '@usd/shared-types';
import { supportTicketCommentRecordSchema } from '@usd/shared-types';
import { adfToPlainText } from './mapIssueToTicket.js';
import { buildTicketCommentSortKey } from '../db/tables/comments.js';

type Json = Record<string, unknown>;

/**
 * Coerces unknown Jira JSON scalars to a safe string.
 */
function jiraScalarToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

/**
 * Maps a Jira REST API comment object to a DynamoDB comment record (idempotent sync key).
 */
export function mapJiraCommentToRecord(params: {
  orgId: string;
  ticketId: string;
  comment: Json;
}): SupportTicketCommentRecord | null {
  const sourceId = jiraScalarToString(params.comment.id).trim();
  if (sourceId.length === 0) {
    return null;
  }
  const commentId = `jira_${sourceId}`;
  const authorRaw = params.comment.author;
  const author =
    typeof authorRaw === 'object' && authorRaw !== null ? (authorRaw as Json) : undefined;
  const displayName = author !== undefined ? jiraScalarToString(author.displayName) : '';
  const email = author !== undefined ? jiraScalarToString(author.emailAddress) : '';
  const created = jiraScalarToString(params.comment.created);
  const createdAt = created.length > 0 ? created : new Date().toISOString();
  const body = adfToPlainText(params.comment.body).trim();
  const commentSource: CommentSource = 'jira_comment';

  return supportTicketCommentRecordSchema.parse({
    orgId: params.orgId,
    ticketCommentKey: buildTicketCommentSortKey(params.ticketId, commentId),
    ticketId: params.ticketId,
    commentId,
    body: body.length > 0 ? body : '—',
    commentSource,
    sourceCommentId: sourceId,
    authorDisplayName: displayName.length > 0 ? displayName : undefined,
    authorEmail: email.length > 0 ? email : undefined,
    createdAt,
  });
}
