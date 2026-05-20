import type { CommentSource, SupportTicketCommentRecord } from '@usd/shared-types';
import { supportTicketCommentRecordSchema } from '@usd/shared-types';
import { buildTicketCommentSortKey } from '../db/tables/comments.js';

type Json = Record<string, unknown>;

/**
 * Coerces unknown SDP JSON scalars to a safe string.
 */
function hdScalarToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

/**
 * Resolves comment body text from an HD conversation row.
 */
export function extractHdConversationBody(row: Json): string {
  const desc = row.description;
  if (typeof desc === 'string' && desc.trim().length > 0) {
    return desc.trim();
  }
  if (typeof desc === 'object' && desc !== null) {
    const d = desc as Json;
    const content = d.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content.trim();
    }
  }
  const content = row.content;
  if (typeof content === 'string' && content.trim().length > 0) {
    return content.trim();
  }
  return '';
}

/**
 * Maps HD conversation type to USD commentSource.
 */
export function mapHdConversationSource(row: Json): CommentSource {
  const typeRaw = hdScalarToString(row.type).toUpperCase();
  if (typeRaw === 'EMAIL') {
    return 'hd_email';
  }
  const show = row.show_to_requester;
  if (show === true || show === 'true') {
    return 'hd_email';
  }
  return 'hd_note';
}

/**
 * Maps one HD conversation row to a DynamoDB comment record (idempotent sync key).
 */
export function mapConversationToRecord(params: {
  orgId: string;
  ticketId: string;
  conversation: Json;
}): SupportTicketCommentRecord | null {
  const sourceId = hdScalarToString(params.conversation.id);
  if (sourceId.length === 0) {
    return null;
  }
  const commentId = `hd_${sourceId}`;
  const commentSource = mapHdConversationSource(params.conversation);
  const body = extractHdConversationBody(params.conversation);
  const created = hdScalarToString(params.conversation.created_time);
  const createdAt = created.length > 0 ? created : new Date().toISOString();
  const sender = params.conversation.sender;
  let authorDisplayName: string | undefined;
  let authorEmail: string | undefined;
  if (typeof sender === 'object' && sender !== null) {
    const s = sender as Json;
    const name = hdScalarToString(s.name);
    const email = hdScalarToString(s.email_id);
    authorDisplayName = name.length > 0 ? name : undefined;
    authorEmail = email.length > 0 ? email : undefined;
  }

  return supportTicketCommentRecordSchema.parse({
    orgId: params.orgId,
    ticketCommentKey: buildTicketCommentSortKey(params.ticketId, commentId),
    ticketId: params.ticketId,
    commentId,
    body: body.length > 0 ? body : '—',
    commentSource,
    sourceCommentId: sourceId,
    authorDisplayName,
    authorEmail,
    createdAt,
  });
}
