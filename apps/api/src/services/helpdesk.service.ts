import { getServerEnv } from '../config/loadEnv.js';
import { AppError } from '../utils/errors.js';
import { getZohoAccessToken } from './zohoAuth.service.js';

type Json = Record<string, unknown>;

/** SDP v3 JSON media type (required on requests). */
const SDP_V3_ACCEPT = 'application/vnd.manageengine.sdp.v3+json';

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
 * Performs an authenticated HTTP request against HELPDESK_URL.
 */
export async function helpdeskFetch(path: string, init?: RequestInit): Promise<Response> {
  const site = requireHelpdeskBaseUrl();
  const url = `${site}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = await buildHelpdeskHeaders(init);
  const res = await fetch(url, {
    ...withoutRequestHeaders(init),
    headers,
  });
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

/**
 * Builds the SDP v3 `input_data` query value for listing requests (pagination via `list_info`).
 */
export function buildRequestsListInputData(rowCount: number, startIndex: number): string {
  const payload = {
    list_info: {
      row_count: rowCount,
      start_index: startIndex,
      fields_required: [...REQUEST_LIST_FIELDS_REQUIRED],
    },
  };
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
}): Promise<{ requests: HelpdeskRequestListItem[]; hasMore: boolean }> {
  const rowCount = options?.rowCount ?? 50;
  const startIndex = options?.startIndex ?? 1;
  const inputData = buildRequestsListInputData(rowCount, startIndex);
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
