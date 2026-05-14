import {
  helpdeskWebhookBodySchema,
  jiraWebhookBodySchema,
  sdpRequestSchema,
} from '@usd/shared-types';
import { mapHdRequestToTicket } from '../helpdesk/mapRequestToTicket.js';
import { mapJiraIssueToTicket } from '../jira/mapIssueToTicket.js';
import { upsertTicket } from '../db/tables/tickets.js';
import { AppError } from '../utils/errors.js';

/**
 * Processes a deserialized Jira webhook JSON body (as delivered via SQS later).
 */
export async function processJiraWebhookJson(body: unknown, orgId: string): Promise<void> {
  const parsed = jiraWebhookBodySchema.parse(body);
  if (parsed.issue === undefined) {
    throw new AppError('Webhook missing issue', 'VALIDATION', 400);
  }
  const record = mapJiraIssueToTicket({ issue: parsed.issue, orgId });
  await upsertTicket(record);
}

/**
 * Processes a deserialized Helpdesk webhook JSON body (as delivered via SQS later).
 */
export async function processHelpdeskWebhookJson(body: unknown, orgId: string): Promise<void> {
  const wrapped = helpdeskWebhookBodySchema.safeParse(body);
  if (wrapped.success && wrapped.data.request !== undefined) {
    const record = mapHdRequestToTicket({ request: wrapped.data.request, orgId });
    await upsertTicket(record);
    return;
  }
  const direct = sdpRequestSchema.safeParse(body);
  if (direct.success) {
    const record = mapHdRequestToTicket({ request: direct.data, orgId });
    await upsertTicket(record);
    return;
  }
  throw new AppError('Helpdesk webhook missing request', 'VALIDATION', 400);
}
