import { getServerEnv } from '../config/loadEnv.js';
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

/**
 * Performs one authenticated HTTP request (no retry; throws AppError on non-OK except 429).
 */
async function helpdeskFetchOnce(path: string, init?: RequestInit): Promise<Response> {
  const site = requireHelpdeskBaseUrl();
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
  options?: { maxRetries?: number; retryDelaysMs?: readonly number[] },
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? HELPDESK_429_RETRY_DELAYS_MS.length;
  const delays = options?.retryDelaysMs ?? HELPDESK_429_RETRY_DELAYS_MS;
  let lastResponse: Response | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      const delayMs = delays[attempt - 1] ?? delays[delays.length - 1] ?? 4000;
      await sleep(delayMs);
    }
    const res = await helpdeskFetchOnce(path, init);
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
export async function helpdeskFetch(path: string, init?: RequestInit): Promise<Response> {
  await sleep(HELPDESK_INTER_REQUEST_DELAY_MS);
  return helpdeskFetchWithBackoff(path, init);
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
] as const;

export type BuildRequestsListInputDataOptions = {
  /** When set, only requests updated after this window are returned. */
  sinceMinutes?: number;
  /** Override clock for tests (`Date.now()` default). */
  nowMs?: number;
};

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
  const sinceMinutes = options?.sinceMinutes;
  if (sinceMinutes !== undefined && sinceMinutes > 0) {
    const nowMs = options?.nowMs ?? Date.now();
    const sinceMs = nowMs - sinceMinutes * 60 * 1000;
    listInfo.search_criteria = {
      field: 'last_updated_time',
      condition: 'greater than',
      value: String(sinceMs),
    };
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
  /** Override clock for tests. */
  nowMs?: number;
}): Promise<{ requests: HelpdeskRequestListItem[]; hasMore: boolean }> {
  const rowCount = options?.rowCount ?? 50;
  const startIndex = options?.startIndex ?? 1;
  const inputData = buildRequestsListInputData(rowCount, startIndex, {
    sinceMinutes: options?.sinceMinutes,
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
  externalId: string;
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

/**
 * Lists conversations for a request using internal id (`GET /requests/{internalId}/conversations`).
 */
export async function fetchRequestConversations(
  internalId: string,
  options?: { rowCount?: number },
): Promise<{ conversations: HelpdeskConversationRow[] }> {
  const id = encodeURIComponent(internalId);
  const rowCount = options?.rowCount ?? 50;
  const inputData = buildConversationsListInputData(rowCount);
  const res = await helpdeskFetch(`/requests/${id}/conversations?input_data=${inputData}`);
  const body: unknown = await res.json();
  const root = typeof body === 'object' && body !== null ? (body as Json) : {};
  const raw = root.conversations;
  const conversations = Array.isArray(raw) ? (raw as HelpdeskConversationRow[]) : [];
  return { conversations };
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
 * Posts a customer-visible email reply (`POST /requests/{internalId}/reply`).
 */
export async function postCustomerEmailReply(
  ticket: HelpdeskCommentTicketRef,
  bodyText: string,
): Promise<void> {
  const requestId = ticket.internalId ?? ticket.externalId;
  const id = encodeURIComponent(requestId);
  const inputDataJson = JSON.stringify({
    reply: {
      description: bodyText,
    },
  });
  const formBody = new URLSearchParams({ input_data: inputDataJson }).toString();
  const res = await helpdeskFetch(`/requests/${id}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });
  void res;
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
