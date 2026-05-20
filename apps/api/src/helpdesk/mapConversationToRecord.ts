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
 * Extracts plain text from SDP fields that may be a string or `{ display_value, value, content }`.
 */
function extractSdpTextField(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw.trim();
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw).trim();
  }
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Json;
    const content = o.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content.trim();
    }
    const display = o.display_value;
    if (typeof display === 'string' && display.trim().length > 0) {
      return display.trim();
    }
    const value = o.value;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

/**
 * Resolves comment body text from an HD conversation or note row.
 * Conversations list omits `description`; notes list returns it as a plain string.
 */
export function extractHdConversationBody(row: Json): string {
  const fromDescription = extractSdpTextField(row.description);
  if (fromDescription.length > 0) {
    return fromDescription;
  }
  const fromContent = extractSdpTextField(row.content);
  if (fromContent.length > 0) {
    return fromContent;
  }
  const fromText = extractSdpTextField(row.text);
  if (fromText.length > 0) {
    return fromText;
  }
  const nestedNote = row.request_note;
  if (nestedNote !== null && typeof nestedNote === 'object' && !Array.isArray(nestedNote)) {
    const nestedBody = extractSdpTextField((nestedNote as Json).description);
    if (nestedBody.length > 0) {
      return nestedBody;
    }
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
 * Merges HD conversation metadata with note body text keyed by conversation id.
 */
export function mergeHdConversationWithNote(conversation: Json, note?: Json): Json {
  if (note === undefined) {
    return conversation;
  }
  const noteDescription = note.description;
  const merged: Json = { ...conversation };
  if (noteDescription !== undefined) {
    merged.description = noteDescription;
  }
  if (merged.created_by === undefined && note.created_by !== undefined) {
    merged.created_by = note.created_by;
  }
  if (merged.created_time === undefined && note.created_time !== undefined) {
    merged.created_time = note.created_time;
  }
  if (merged.show_to_requester === undefined && note.show_to_requester !== undefined) {
    merged.show_to_requester = note.show_to_requester;
  }
  return merged;
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
  const sender = params.conversation.sender ?? params.conversation.created_by ?? params.conversation.performed_by;
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
