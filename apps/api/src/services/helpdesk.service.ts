import sanitizeHtml from 'sanitize-html';
import { getServerEnv } from '../config/loadEnv.js';
import { runWithConcurrencyLimit } from '../utils/concurrency.js';
import { AppError } from '../utils/errors.js';
import { getZohoAccessToken } from './zohoAuth.service.js';

type Json = Record<string, unknown>;

/** SDP v3 JSON media type (required on requests). */
const SDP_V3_ACCEPT = 'application/vnd.manageengine.sdp.v3+json';

/** Delay between consecutive Helpdesk API calls (rate limiting). */
export const HELPDESK_INTER_REQUEST_DELAY_MS = 100;

/** Backoff delays after HTTP 429 (max 3 retries). */
export const HELPDESK_429_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

/**
 * Pauses execution for outbound Helpdesk rate limiting.
 */
export async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Returns trimmed Helpdesk API base URL or throws if unset.
 */
function requireHelpdeskBaseUrl(): string {
  const env = getServerEnv();
  const raw = env.HELPDESK_URL;
  if (raw === undefined || raw.trim().length === 0) {
    throw new AppError('HELPDESK_URL is not configured', 'CONFIG', 500);
  }
  return raw.replace(/\/+$/, '');
}

/**
 * Bare SDP `/api/v3` root for notifications (strips `/app/<portal>` from HELPDESK_URL when present).
 * Example: `https://host/app/itdesk/api/v3` → `https://host/api/v3`.
 */
export function helpdeskApiV3Base(): string {
  const site = requireHelpdeskBaseUrl();
  return site.replace(/\/app\/[^/]+(?=\/api\/v3(?:\/|$))/, '');
}

/**
 * Drops `headers` from init so fetch does not merge conflicting header objects.
 */
function withoutRequestHeaders(init?: RequestInit): Omit<RequestInit, 'headers'> {
  if (init === undefined) {
    return {};
  }
  const { headers: _h, ...rest } = init;
  void _h;
  return rest;
}

/**
 * Merges optional headers with Helpdesk auth. GET/HEAD omit `Content-Type` (SDP returns 415 if set).
 */
async function buildHelpdeskHeaders(init?: RequestInit): Promise<Record<string, string>> {
  const token = await getZohoAccessToken();
  const method = (init?.method ?? 'GET').toUpperCase();
  const out: Record<string, string> = {
    Accept: SDP_V3_ACCEPT,
    Authorization: `Zoho-oauthtoken ${token}`,
  };
  if (method !== 'GET' && method !== 'HEAD') {
    out['Content-Type'] = 'application/json';
  }
  if (init?.headers === undefined) {
    return stripContentTypeForGet(out, method);
  }
  const h = init.headers;
  if (h instanceof Headers) {
    h.forEach((value, key) => {
      out[key] = value;
    });
  } else if (Array.isArray(h)) {
    for (const pair of h) {
      const key = pair[0];
      const value = pair[1];
      if (key !== undefined && value !== undefined) {
        out[key] = value;
      }
    }
  } else if (typeof h === 'object') {
    for (const [key, value] of Object.entries(h as Record<string, unknown>)) {
      if (typeof value === 'string') {
        out[key] = value;
      }
    }
  }
  return stripContentTypeForGet(out, method);
}

/**
 * Removes Content-Type for GET/HEAD so SDP does not treat the call as JSON body upload.
 */
function stripContentTypeForGet(
  headers: Record<string, string>,
  method: string,
): Record<string, string> {
  if (method !== 'GET' && method !== 'HEAD') {
    return headers;
  }
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== 'content-type') {
      next[key] = value;
    }
  }
  return next;
}

type HelpdeskFetchOptions = {
  maxRetries?: number;
  retryDelaysMs?: readonly number[];
  /** Override API root (defaults to HELPDESK_URL). */
  baseUrl?: string;
};

/**
 * Performs one authenticated HTTP request (no retry; throws AppError on non-OK except 429).
 */
async function helpdeskFetchOnce(
  path: string,
  init?: RequestInit,
  baseUrl?: string,
): Promise<Response> {
  const site = (baseUrl ?? requireHelpdeskBaseUrl()).replace(/\/+$/, '');
  const url = `${site}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = await buildHelpdeskHeaders(init);
  return fetch(url, {
    ...withoutRequestHeaders(init),
    headers,
  });
}

/**
 * Authenticated Helpdesk request with exponential backoff on HTTP 429.
 */
export async function helpdeskFetchWithBackoff(
  path: string,
  init?: RequestInit,
  options?: HelpdeskFetchOptions,
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? HELPDESK_429_RETRY_DELAYS_MS.length;
  const delays = options?.retryDelaysMs ?? HELPDESK_429_RETRY_DELAYS_MS;
  const baseUrl = options?.baseUrl;
  let lastResponse: Response | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      const delayMs = delays[attempt - 1] ?? delays[delays.length - 1] ?? 4000;
      await sleep(delayMs);
    }
    const res = await helpdeskFetchOnce(path, init, baseUrl);
    if (res.status === 429 && attempt < maxRetries) {
      lastResponse = res;
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new AppError(
        `Helpdesk API error ${String(res.status)}: ${text.slice(0, 500)}`,
        'HELPDESK_API',
        res.status >= 400 && res.status < 600 ? res.status : 502,
      );
    }
    return res;
  }
  const status = lastResponse?.status ?? 429;
  throw new AppError(
    `Helpdesk API error ${String(status)}: rate limited after retries`,
    'HELPDESK_API',
    429,
  );
}

/**
 * Performs an authenticated HTTP request against HELPDESK_URL (paced + 429 backoff).
 */
export async function helpdeskFetch(
  path: string,
  init?: RequestInit,
  options?: HelpdeskFetchOptions,
): Promise<Response> {
  await sleep(HELPDESK_INTER_REQUEST_DELAY_MS);
  return helpdeskFetchWithBackoff(path, init, options);
}

/**
 * Helpdesk fetch against bare `/api/v3` (notifications POST), not the `/app/<portal>/api/v3` base.
 */
export async function helpdeskFetchOnApiV3Base(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return helpdeskFetch(path, init, { baseUrl: helpdeskApiV3Base() });
}

export type HelpdeskRequestListItem = Json;

/**
 * SDP v3 list fields for sync/webhook mapping (`fields_required` always includes `id`).
 * Without this, list responses omit `description` and other nested refs.
 */
export const REQUEST_LIST_FIELDS_REQUIRED = [
  'display_id',
  'subject',
  'description',
  'status',
  'priority',
  'technician',
  'requester',
  'created_time',
  'last_updated_time',
] as const;

export type BuildRequestsListInputDataOptions = {
  /** When set, only requests updated after this window are returned. */
  sinceMinutes?: number;
  /** When set, only requests assigned to this technician display name are returned. */
  technicianName?: string;
  /** Override clock for tests (`Date.now()` default). */
  nowMs?: number;
};

type SdpSearchCriterion = {
  field: string;
  condition: string;
  value: string;
};

/**
 * Builds SDP v3 `search_criteria` for request list (single object or array when multiple filters).
 */
export function buildRequestsSearchCriteria(
  options?: BuildRequestsListInputDataOptions,
): SdpSearchCriterion[] {
  const criteria: SdpSearchCriterion[] = [];
  const sinceMinutes = options?.sinceMinutes;
  if (sinceMinutes !== undefined && sinceMinutes > 0) {
    const nowMs = options?.nowMs ?? Date.now();
    const sinceMs = nowMs - sinceMinutes * 60 * 1000;
    criteria.push({
      field: 'last_updated_time',
      condition: 'greater than',
      value: String(sinceMs),
    });
  }
  const technicianName = options?.technicianName?.trim();
  if (technicianName !== undefined && technicianName.length > 0) {
    criteria.push({
      field: 'technician.name',
      condition: 'is',
      value: technicianName,
    });
  }
  return criteria;
}

/**
 * Builds the SDP v3 `input_data` query value for listing requests (pagination via `list_info`).
 */
export function buildRequestsListInputData(
  rowCount: number,
  startIndex: number,
  options?: BuildRequestsListInputDataOptions,
): string {
  const listInfo: Record<string, unknown> = {
    row_count: rowCount,
    start_index: startIndex,
    fields_required: [...REQUEST_LIST_FIELDS_REQUIRED],
  };
  const criteria = buildRequestsSearchCriteria(options);
  if (criteria.length === 1) {
    listInfo.search_criteria = criteria[0];
  } else if (criteria.length > 1) {
    listInfo.search_criteria = criteria;
  }
  const payload = { list_info: listInfo };
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Lists requests (tickets) using SDP v3 pagination (`input_data` with `list_info.row_count` / `start_index`).
 */
export async function fetchRequestsPage(options?: {
  /** Page size (maps to `list_info.row_count`). */
  rowCount?: number;
  /** First row index for this page (maps to `list_info.start_index`, 1-based). */
  startIndex?: number;
  /** Incremental sync: only requests updated in the last N minutes. */
  sinceMinutes?: number;
  /** Filter by technician display name (`technician.name` is). */
  technicianName?: string;
  /** Override clock for tests. */
  nowMs?: number;
}): Promise<{ requests: HelpdeskRequestListItem[]; hasMore: boolean }> {
  const rowCount = options?.rowCount ?? 50;
  const startIndex = options?.startIndex ?? 1;
  const inputData = buildRequestsListInputData(rowCount, startIndex, {
    sinceMinutes: options?.sinceMinutes,
    technicianName: options?.technicianName,
    nowMs: options?.nowMs,
  });
  const res = await helpdeskFetch(`/requests?input_data=${inputData}`);
  const body: unknown = await res.json();
  const root = typeof body === 'object' && body !== null ? (body as Json) : {};
  const rawList = root.requests;
  const list = Array.isArray(rawList) ? (rawList as HelpdeskRequestListItem[]) : [];
  const listInfo = root.list_info;
  let hasMore = false;
  if (typeof listInfo === 'object' && listInfo !== null && !Array.isArray(listInfo)) {
    const li = listInfo as Json;
    const hm = li.has_more_rows;
    if (typeof hm === 'boolean') {
      hasMore = hm;
    }
  } else if (list.length === rowCount && list.length > 0) {
    hasMore = true;
  }
  return { requests: list, hasMore };
}

/**
 * Loads a single request by id (numeric or string id in path).
 */
export async function fetchSingleRequest(requestId: string): Promise<Json> {
  const id = encodeURIComponent(requestId);
  const res = await helpdeskFetch(`/requests/${id}`);
  const body: unknown = await res.json();
  if (typeof body === 'object' && body !== null && 'request' in body) {
    const reqObj = (body as { request?: unknown }).request;
    if (typeof reqObj === 'object' && reqObj !== null) {
      return reqObj as Json;
    }
  }
  if (typeof body === 'object' && body !== null) {
    return body as Json;
  }
  return {};
}

/**
 * Minimal ticket slice needed to resolve the SDP request id for `/requests/{id}/notes`.
 * Cloud SDP expects the **internal** request id in the path; display ids return 404.
 */
export type HelpdeskCommentTicketRef = {
  internalId?: string | undefined;
  /** HD display id (`display_id.value`, e.g. `187438`) for reply subject threading. */
  externalId: string;
  /** Requester email (optional; SDP addresses via `in_reply_to`). */
  customerEmail?: string | undefined;
  /** Ticket subject line (`summary`) for notification reply subject. */
  subject?: string | undefined;
};

/**
 * Posts a plain-text note on an SDP request using v3 `input_data` form encoding.
 * SDP **Cloud** expects the wrapper key `request_note` (on‑prem docs use `note`; Cloud
 * returns EXTRA_KEY_FOUND_IN_JSON for `note`). Payload: `{"request_note":{"description":"…"}}`.
 */
/** Fields required on conversation list rows (metadata only; body text comes from `/notes`). */
export const CONVERSATION_LIST_FIELDS_REQUIRED = [
  'id',
  'type',
  'created_time',
  'show_to_requester',
  'created_by',
] as const;

/** Fields required on notes list rows (includes plain-text `description`). */
export const REQUEST_NOTES_FIELDS_REQUIRED = [
  'id',
  'description',
  'created_time',
  'show_to_requester',
  'created_by',
  'performed_by',
] as const;

/**
 * Builds SDP v3 `input_data` for listing request conversations.
 */
export function buildConversationsListInputData(rowCount: number): string {
  const payload = {
    list_info: {
      row_count: rowCount,
      fields_required: [...CONVERSATION_LIST_FIELDS_REQUIRED],
    },
  };
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Builds SDP v3 `input_data` for listing request notes (includes note body in `description`).
 */
export function buildNotesListInputData(rowCount: number): string {
  const payload = {
    list_info: {
      row_count: rowCount,
      fields_required: [...REQUEST_NOTES_FIELDS_REQUIRED],
    },
  };
  return encodeURIComponent(JSON.stringify(payload));
}

export type HelpdeskConversationRow = Json;

/** Max parallel notification fetches when hydrating conversation bodies. */
export const HD_CONVERSATION_HYDRATE_CONCURRENCY = 5;

/**
 * Coerces unknown SDP JSON scalars to a safe string id.
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
 * Parses a single notification object from an SDP notifications GET response.
 */
export function parseHelpdeskNotificationResponse(body: unknown): Json | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const root = body as Json;
  const wrapped = root.notification;
  if (typeof wrapped === 'object' && wrapped !== null && !Array.isArray(wrapped)) {
    return wrapped as Json;
  }
  return root;
}

/**
 * Merges notification fields (description, subject, sender, timestamps) into a conversation list row.
 */
export function mergeNotificationIntoConversationRow(row: Json, notification: Json): Json {
  const merged: Json = { ...row };
  if (notification.description !== undefined) {
    merged.description = notification.description;
  }
  if (notification.subject !== undefined) {
    merged.subject = notification.subject;
  }
  if (notification.sender !== undefined) {
    merged.sender = notification.sender;
  }
  if (merged.created_time === undefined && notification.created_time !== undefined) {
    merged.created_time = notification.created_time;
  }
  if (merged.type === undefined && notification.type !== undefined) {
    merged.type = notification.type;
  }
  return merged;
}

/**
 * Loads one email conversation notification (`GET /requests/{internalId}/notifications/{conversationId}`).
 * Returns null when the request fails or the response is not a notification object.
 */
export async function fetchRequestNotification(
  internalId: string,
  conversationId: string,
): Promise<Json | null> {
  try {
    const requestId = encodeURIComponent(internalId);
    const convId = encodeURIComponent(conversationId);
    const res = await helpdeskFetch(`/requests/${requestId}/notifications/${convId}`);
    const body: unknown = await res.json();
    return parseHelpdeskNotificationResponse(body);
  } catch {
    return null;
  }
}

/**
 * Hydrates all conversation rows with notification details (body, subject, sender, timestamps).
 */
async function hydrateConversationRows(
  internalId: string,
  conversations: HelpdeskConversationRow[],
): Promise<HelpdeskConversationRow[]> {
  await runWithConcurrencyLimit(conversations, HD_CONVERSATION_HYDRATE_CONCURRENCY, async (row) => {
    const convId = hdScalarToString(row.id);
    if (convId.length === 0) {
      return;
    }
    const notification = await fetchRequestNotification(internalId, convId);
    if (notification === null) {
      return;
    }
    const merged = mergeNotificationIntoConversationRow(row, notification);
    for (const [key, value] of Object.entries(merged)) {
      row[key] = value;
    }
  });
  return conversations;
}

/**
 * Lists conversations for a request using internal id (`GET /requests/{internalId}/conversations`).
 * Rows are hydrated via `/notifications/{id}` because the list endpoint omits bodies for many types.
 */
export async function fetchRequestConversations(
  internalId: string,
  options?: { rowCount?: number; hydrate?: boolean },
): Promise<{ conversations: HelpdeskConversationRow[] }> {
  const id = encodeURIComponent(internalId);
  const rowCount = options?.rowCount ?? 50;
  const inputData = buildConversationsListInputData(rowCount);
  const res = await helpdeskFetch(`/requests/${id}/conversations?input_data=${inputData}`);
  const body: unknown = await res.json();
  const root = typeof body === 'object' && body !== null ? (body as Json) : {};
  const raw = root.conversations;
  const conversations = Array.isArray(raw) ? (raw as HelpdeskConversationRow[]) : [];
  const shouldHydrate = options?.hydrate !== false;
  if (!shouldHydrate || conversations.length === 0) {
    return { conversations };
  }
  const hydrated = await hydrateConversationRows(internalId, conversations);
  return { conversations: hydrated };
}

export type HelpdeskNoteRow = Json;

/**
 * Lists notes for a request (`GET /requests/{internalId}/notes`) — includes `description` body text.
 */
export async function fetchRequestNotes(
  internalId: string,
  options?: { rowCount?: number },
): Promise<{ notes: HelpdeskNoteRow[] }> {
  const id = encodeURIComponent(internalId);
  const rowCount = options?.rowCount ?? 50;
  const inputData = buildNotesListInputData(rowCount);
  const res = await helpdeskFetch(`/requests/${id}/notes?input_data=${inputData}`);
  const body: unknown = await res.json();
  const root = typeof body === 'object' && body !== null ? (body as Json) : {};
  const rawNotes = root.notes ?? root.request_notes;
  const notes = Array.isArray(rawNotes) ? (rawNotes as HelpdeskNoteRow[]) : [];
  return { notes };
}

/**
 * Builds SDP notification subject for threaded customer email replies.
 * Format: `Re: [Request ID :##<displayId>##] : <subject>` or without suffix when subject omitted.
 */
export function buildCustomerEmailReplySubject(displayId: string, subject?: string): string {
  const id = displayId.trim();
  const prefix = `Re: [Request ID :##${id}##]`;
  const trimmedSubject = subject?.trim();
  if (trimmedSubject !== undefined && trimmedSubject.length > 0) {
    return `${prefix} : ${trimmedSubject}`;
  }
  return prefix;
}

/**
 * Escapes plain text for minimal HTML email bodies.
 */
function escapeHtmlForEmail(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Safe HTML allowlist for customer email reply bodies sent to ManageEngine. */
const EMAIL_REPLY_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'blockquote'],
  allowedAttributes: {
    a: ['href'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
};

/**
 * Strips unsafe tags/attributes from HTML email reply bodies.
 */
function sanitizeEmailReplyHtml(html: string): string {
  return sanitizeHtml(html, EMAIL_REPLY_SANITIZE_OPTIONS);
}

/**
 * Wraps plain-text reply bodies in a single paragraph when not already HTML.
 */
export function wrapEmailReplyDescription(bodyText: string): string {
  const trimmed = bodyText.trim();
  if (trimmed.length === 0) {
    return '<p></p>';
  }
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizeEmailReplyHtml(trimmed);
  }
  return `<p>${escapeHtmlForEmail(trimmed).replace(/\n/g, '<br/>')}</p>`;
}

/**
 * Parses SDP `response_status` from a JSON body.
 */
export function parseHelpdeskResponseStatus(body: unknown): {
  statusCode: number;
  message: string;
} {
  if (typeof body !== 'object' || body === null) {
    return { statusCode: -1, message: 'Invalid Helpdesk response' };
  }
  const root = body as Json;
  const rs = root.response_status;
  if (typeof rs !== 'object' || rs === null || Array.isArray(rs)) {
    return { statusCode: -1, message: 'Missing response_status in Helpdesk response' };
  }
  const statusObj = rs as Json;
  const rawCode = statusObj.status_code;
  const statusCode =
    typeof rawCode === 'number'
      ? rawCode
      : typeof rawCode === 'string'
        ? Number.parseInt(rawCode, 10)
        : -1;
  let message = 'Helpdesk notification request failed';
  const messages = statusObj.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const first: unknown = messages[0];
    if (typeof first === 'object' && first !== null && 'message' in first) {
      const m = (first as Json).message;
      if (typeof m === 'string' && m.length > 0) {
        message = m;
      }
    }
  }
  return {
    statusCode: Number.isFinite(statusCode) ? statusCode : -1,
    message,
  };
}

/**
 * Asserts SDP success (`response_status.status_code` 2000) or throws AppError.
 */
export function assertHelpdeskSdpSuccess(body: unknown): void {
  const { statusCode, message } = parseHelpdeskResponseStatus(body);
  if (statusCode !== 2000) {
    throw new AppError(message, 'HELPDESK_API', 502);
  }
}

/**
 * Posts a customer-visible email reply (`POST /api/v3/requests/{internalId}/notifications`).
 */
export async function postCustomerEmailReply(
  ticket: HelpdeskCommentTicketRef,
  bodyText: string,
): Promise<void> {
  const internalId = ticket.internalId?.trim();
  if (internalId === undefined || internalId.length === 0) {
    throw new AppError(
      'Helpdesk internal request id is required for customer email reply',
      'VALIDATION',
      400,
    );
  }
  const id = encodeURIComponent(internalId);
  const inputDataJson = JSON.stringify({
    notification: {
      subject: buildCustomerEmailReplySubject(ticket.externalId, ticket.subject),
      description: wrapEmailReplyDescription(bodyText),
      in_reply_to: { id: internalId },
      type: 'CONVERSATION',
    },
  });
  const formBody = new URLSearchParams({ input_data: inputDataJson }).toString();
  const res = await helpdeskFetchOnApiV3Base(`/requests/${id}/notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });
  const body: unknown = await res.json();
  assertHelpdeskSdpSuccess(body);
}

export async function postComment(ticket: HelpdeskCommentTicketRef, bodyText: string): Promise<void> {
  const requestId = ticket.internalId ?? ticket.externalId;
  const id = encodeURIComponent(requestId);
  const inputDataJson = JSON.stringify({
    request_note: {
      description: bodyText,
    },
  });
  const formBody = new URLSearchParams({ input_data: inputDataJson }).toString();
  const res = await helpdeskFetch(`/requests/${id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });
  void res;
}
