import type {
  JiraIssue,
  SupportTicketRecord,
  TicketPriority,
  TicketStatus,
} from '@usd/shared-types';
import { jiraIssueSchema, ticketPrioritySchema, ticketStatusSchema } from '@usd/shared-types';

/**
 * Maps Jira priority label to USD enum.
 */
export function mapJiraPriorityName(name: string | undefined): TicketPriority {
  const n = (name ?? '').toLowerCase();
  if (n.includes('highest') || n.includes('critical') || n.includes('blocker')) {
    return 'critical';
  }
  if (n.includes('high')) {
    return 'high';
  }
  if (n.includes('low') || n.includes('lowest') || n.includes('trivial')) {
    return 'low';
  }
  return 'medium';
}

/**
 * Maps Jira status label to USD enum.
 */
export function mapJiraStatusName(name: string | undefined): TicketStatus {
  const n = (name ?? '').toLowerCase();
  if (n.includes('done') || n.includes('closed') || n.includes('complete')) {
    return 'closed';
  }
  if (n.includes('resolved')) {
    return 'resolved';
  }
  if (n.includes('progress') || n.includes('doing') || n.includes('review')) {
    return 'in_progress';
  }
  return 'open';
}

/** Prefix of serialized Jira Cloud ADF description JSON. */
const ADF_DOC_JSON_PREFIX = '{"type":"doc"';

/**
 * Returns true when `value` is an Atlassian Document Format root node.
 */
function isAdfDocument(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'doc';
}

/**
 * Recursively collects `text` fields from ADF `content` trees into plain text.
 */
export function adfToPlainText(node: unknown): string {
  const parts: string[] = [];

  function walk(n: unknown): void {
    if (n === undefined || n === null) {
      return;
    }
    if (typeof n !== 'object') {
      return;
    }
    const o = n as Record<string, unknown>;
    if (o.type === 'text' && typeof o.text === 'string') {
      parts.push(o.text);
    }
    const content = o.content;
    if (Array.isArray(content)) {
      for (const child of content) {
        walk(child);
      }
    }
  }

  walk(node);
  return parts.join('');
}

/**
 * Normalizes Jira description (plain text or ADF) to a plain string for storage.
 */
export function normalizeJiraDescription(raw: unknown): string {
  if (raw === undefined || raw === null) {
    return '';
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return '';
    }
    if (trimmed.startsWith(ADF_DOC_JSON_PREFIX)) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (isAdfDocument(parsed)) {
          return adfToPlainText(parsed);
        }
      } catch {
        return raw;
      }
    }
    return raw;
  }
  if (isAdfDocument(raw)) {
    return adfToPlainText(raw);
  }
  if (typeof raw === 'object') {
    return adfToPlainText(raw);
  }
  return '';
}

export type MapIssueInput = {
  issue: JiraIssue;
  orgId: string;
  nowIso?: string;
};

type JiraUserRef = {
  displayName?: string | undefined;
  emailAddress?: string | undefined;
  accountId?: string | undefined;
};

/**
 * Maps Jira assignee/reporter to a display label (never raw `accountId`).
 */
export function mapJiraUserDisplayName(user: JiraUserRef | null | undefined): string | undefined {
  if (user === null || user === undefined) {
    return undefined;
  }
  const displayName = user.displayName?.trim();
  if (displayName !== undefined && displayName.length > 0) {
    return displayName;
  }
  const email = user.emailAddress?.trim();
  if (email !== undefined && email.length > 0) {
    return email;
  }
  return undefined;
}

/**
 * Builds a `support_tickets` item from a Jira issue (`ticketId` = `jira_` + issue key).
 */
export function mapJiraIssueToTicket(input: MapIssueInput): SupportTicketRecord {
  const issue = jiraIssueSchema.parse(input.issue);
  const orgId = input.orgId;
  const now = input.nowIso ?? new Date().toISOString();
  const fields = issue.fields;
  const summary = fields.summary ?? '(no summary)';
  const priority = ticketPrioritySchema.parse(mapJiraPriorityName(fields.priority?.name));
  const status = ticketStatusSchema.parse(mapJiraStatusName(fields.status?.name));
  const assigneeId = mapJiraUserDisplayName(fields.assignee);
  const reporterId = mapJiraUserDisplayName(fields.reporter);
  return {
    ticketId: `jira_${issue.key}`,
    orgId,
    source: 'jira',
    externalId: issue.key,
    summary,
    description: normalizeJiraDescription(fields.description),
    priority,
    status,
    assigneeId,
    reporterId,
    createdAt: now,
    updatedAt: now,
  };
}
