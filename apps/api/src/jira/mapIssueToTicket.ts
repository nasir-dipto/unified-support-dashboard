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

/**
 * Normalizes Jira description (string or Atlassian Document Format) to plain text / JSON string.
 */
export function normalizeJiraDescription(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw === 'string') {
    return raw.length > 0 ? raw : undefined;
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return undefined;
  }
}

export type MapIssueInput = {
  issue: JiraIssue;
  orgId: string;
  nowIso?: string;
};

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
  const assigneeId =
    fields.assignee?.accountId ??
    (fields.assignee?.displayName !== undefined && fields.assignee.displayName.length > 0
      ? fields.assignee.displayName
      : undefined);
  const reporterId =
    fields.reporter?.accountId ??
    (fields.reporter?.displayName !== undefined && fields.reporter.displayName.length > 0
      ? fields.reporter.displayName
      : undefined);
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
