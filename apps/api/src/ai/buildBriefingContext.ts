import type { SentimentSummaryResponse, TicketApiDto } from '@usd/shared-types';
import { listHdTicketsWithSentiment } from '../db/tables/tickets.js';
import { buildSentimentSummary, formatSummaryForBriefing } from '../sentiment/aggregateSummary.js';

const OPEN_STATUSES: TicketApiDto['status'][] = ['open', 'in_progress', 'pending'];

/**
 * Loads org Helpdesk sentiment aggregates and open critical count for briefing prompts.
 */
export async function buildBriefingContext(orgId: string): Promise<{
  summary: SentimentSummaryResponse;
  promptText: string;
}> {
  const records = await listHdTicketsWithSentiment(orgId);
  const summary = buildSentimentSummary(records);
  const openCritical = records.filter(
    (t) => t.priority === 'critical' && OPEN_STATUSES.includes(t.status),
  ).length;
  const promptText = formatSummaryForBriefing(summary, openCritical);
  return { summary, promptText };
}
