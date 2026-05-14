import { jiraWebhookBodySchema } from '@usd/shared-types';
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
