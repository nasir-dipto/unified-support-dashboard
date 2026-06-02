import { getServerEnv } from '../config/loadEnv.js';
import { AppError } from '../utils/errors.js';

type Json = Record<string, unknown>;

/**
 * Coerces unknown Jira JSON scalars to a safe string for ids and display text.
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
 * Returns trimmed Jira site base URL or throws if unset.
 */
function requireJiraBaseUrl(): string {
  const env = getServerEnv();
  const raw = env.JIRA_URL;
  if (raw === undefined || raw.trim().length === 0) {
    throw new AppError('JIRA_URL is not configured', 'CONFIG', 500);
  }
  return raw.replace(/\/+$/, '');
}

/**
 * Builds Basic Authorization header for Jira Cloud REST.
 */
function requireJiraAuthHeader(): string {
  const env = getServerEnv();
  const email = env.JIRA_EMAIL;
  const token = env.JIRA_API_TOKEN;
  if (email === undefined || email.length === 0 || token === undefined || token.length === 0) {
    throw new AppError('JIRA_EMAIL and JIRA_API_TOKEN are required', 'CONFIG', 500);
  }
  const basic = Buffer.from(`${email}:${token}`, 'utf8').toString('base64');
  return `Basic ${basic}`;
}

/**
 * Merges optional `RequestInit.headers` with required Jira JSON + Basic Auth headers.
 */
function buildJiraHeaders(init?: RequestInit): Record<string, string> {
  const base: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: requireJiraAuthHeader(),
  };
  if (init?.headers === undefined) {
    return base;
  }
  const h = init.headers;
  if (h instanceof Headers) {
    h.forEach((value, key) => {
      base[key] = value;
    });
    return base;
  }
  if (Array.isArray(h)) {
    for (const pair of h) {
      const key = pair[0];
      const value = pair[1];
      if (key !== undefined && value !== undefined) {
        base[key] = value;
      }
    }
    return base;
  }
  if (typeof h === 'object') {
    for (const [key, value] of Object.entries(h as Record<string, unknown>)) {
      if (typeof value === 'string') {
        base[key] = value;
      }
    }
  }
  return base;
}

/**
 * Drops `headers` from init so `fetch` does not merge conflicting header objects.
 */
function withoutRequestHeaders(init?: RequestInit): Omit<RequestInit, 'headers'> {
  if (init === undefined) {
    return {};
  }
  const { headers: _h, ...rest } = init;
  void _h;
  return rest;
}

async function jiraFetch(path: string, init?: RequestInit): Promise<Response> {
  const site = requireJiraBaseUrl();
  const url = `${site}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...withoutRequestHeaders(init),
    headers: buildJiraHeaders(init),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new AppError(
      `Jira API error ${String(res.status)}: ${text.slice(0, 500)}`,
      'JIRA_API',
      res.status >= 400 && res.status < 600 ? res.status : 502,
    );
  }
  return res;
}

export type JiraProject = { key: string; name: string; id: string };

/**
 * Lists Jira projects visible to the credentials.
 */
export async function fetchProjects(): Promise<JiraProject[]> {
  const res = await jiraFetch('/rest/api/3/project');
  const body: unknown = await res.json();
  if (Array.isArray(body)) {
    return body.map((item) => {
      const o = item as Json;
      return {
        id: jiraScalarToString(o.id),
        key: jiraScalarToString(o.key),
        name: jiraScalarToString(o.name),
      };
    });
  }
  if (typeof body === 'object' && body !== null && 'values' in body) {
    const rawValues = (body as { values?: unknown }).values;
    const values = Array.isArray(rawValues) ? rawValues : [];
    return values.map((v) => {
      const row = v as Json;
      return {
        id: jiraScalarToString(row.id),
        key: jiraScalarToString(row.key),
        name: jiraScalarToString(row.name),
      };
    });
  }
  return [];
}

function issueFieldsAsJson(fieldsRaw: unknown): Json {
  if (typeof fieldsRaw === 'object' && fieldsRaw !== null && !Array.isArray(fieldsRaw)) {
    return fieldsRaw as Json;
  }
  return {};
}

export type JiraIssueSearchHit = { key: string; fields?: Json };

/** Fields requested for JQL search results (used by ticket mapping). */
const JIRA_SEARCH_FIELDS = [
  'summary',
  'description',
  'priority',
  'status',
  'assignee',
  'reporter',
  'created',
  'updated',
] as const;

/**
 * Builds JQL for listing issues in a project, optionally filtered by assignee and updated time.
 */
export function buildProjectIssuesJql(
  projectKey: string,
  assigneeFilter?: string,
  sinceMinutes?: number,
): string {
  const clauses: string[] = [`project = ${projectKey}`];
  const trimmed = assigneeFilter?.trim();
  if (trimmed !== undefined && trimmed.length > 0) {
    clauses.push(`assignee = "${trimmed}"`);
  }
  if (sinceMinutes !== undefined && sinceMinutes > 0) {
    clauses.push(`updated > -${String(sinceMinutes)}m`);
  }
  return `${clauses.join(' AND ')} ORDER BY updated DESC`;
}

/**
 * Lists issues in a project via enhanced JQL search (`POST /rest/api/3/search/jql`).
 * Pagination uses `nextPageToken` from the response (pass it on the next call).
 */
export async function fetchIssuesByProject(
  projectKey: string,
  options?: { maxResults?: number; nextPageToken?: string; sinceMinutes?: number },
): Promise<{
  issues: JiraIssueSearchHit[];
  total: number;
  nextPageToken?: string;
}> {
  const maxResults = options?.maxResults ?? 50;
  const env = getServerEnv();
  const jql = buildProjectIssuesJql(projectKey, env.JIRA_ASSIGNEE_FILTER, options?.sinceMinutes);
  const requestBody: Record<string, unknown> = {
    jql,
    fields: [...JIRA_SEARCH_FIELDS],
    maxResults,
  };
  const token = options?.nextPageToken;
  if (token !== undefined && token.length > 0) {
    requestBody.nextPageToken = token;
  }
  const res = await jiraFetch('/rest/api/3/search/jql', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
  const body = (await res.json()) as {
    issues?: Json[];
    total?: number;
    nextPageToken?: string;
  };
  const issues = (body.issues ?? []).map((row) => {
    return {
      key: jiraScalarToString(row.key),
      fields: issueFieldsAsJson(row.fields),
    };
  });
  const total = typeof body.total === 'number' ? body.total : issues.length;
  const nextPageToken =
    typeof body.nextPageToken === 'string' && body.nextPageToken.length > 0
      ? body.nextPageToken
      : undefined;
  return { issues, total, nextPageToken };
}

/**
 * Loads a single issue (optionally with rendered fields).
 */
export async function fetchSingleIssue(issueKey: string): Promise<Json> {
  const key = encodeURIComponent(issueKey);
  const res = await jiraFetch(`/rest/api/3/issue/${key}?expand=renderedFields`);
  const data: unknown = await res.json();
  return data as Json;
}

export type JiraCommentHit = Json;

/**
 * Lists comments on a Jira issue (`GET /rest/api/3/issue/{key}/comment`).
 */
export async function fetchIssueComments(
  issueKey: string,
  options?: { startAt?: number; maxResults?: number },
): Promise<{ comments: JiraCommentHit[]; total: number }> {
  const key = encodeURIComponent(issueKey);
  const startAt = options?.startAt ?? 0;
  const maxResults = options?.maxResults ?? 100;
  const res = await jiraFetch(
    `/rest/api/3/issue/${key}/comment?startAt=${String(startAt)}&maxResults=${String(maxResults)}`,
  );
  const body: unknown = await res.json();
  const root = typeof body === 'object' && body !== null ? (body as Json) : {};
  const rawComments = root.comments;
  const comments = Array.isArray(rawComments) ? (rawComments as JiraCommentHit[]) : [];
  const total =
    typeof root.total === 'number' ? root.total : comments.length;
  return { comments, total };
}

/**
 * Posts an issue comment (document body for Jira Cloud v3).
 */
export async function postComment(issueKey: string, bodyText: string): Promise<void> {
  const key = encodeURIComponent(issueKey);
  const res = await jiraFetch(`/rest/api/3/issue/${key}/comment`, {
    method: 'POST',
    body: JSON.stringify({
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: bodyText }],
          },
        ],
      },
    }),
  });
  void res;
}

/**
 * Transitions an issue to the given transition id.
 */
export async function transitionIssue(issueKey: string, transitionId: string): Promise<void> {
  const key = encodeURIComponent(issueKey);
  const res = await jiraFetch(`/rest/api/3/issue/${key}/transitions`, {
    method: 'POST',
    body: JSON.stringify({
      transition: { id: transitionId },
    }),
  });
  void res;
}
