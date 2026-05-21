import type { SupportTicketRecord } from '@usd/shared-types';
import {
  listHdTicketsForSentiment,
  updateTicketSentiment,
} from '../db/tables/tickets.js';
import { analyzeHdTicketSentiment } from '../services/sentiment.service.js';
import { notifyChurnRiskIfNeeded } from '../services/notifications.service.js';

export type BatchRunResult = {
  examined: number;
  analyzed: number;
  skipped: number;
  errors: number;
};

/**
 * Processes stale Helpdesk tickets only (incremental batch after sync).
 */
export async function runIncrementalBatch(orgId: string): Promise<BatchRunResult> {
  const tickets = await listHdTicketsForSentiment({ orgId, staleOnly: true });
  return processTicketList(orgId, tickets);
}

/**
 * Processes all Helpdesk tickets (nightly full batch), still respecting hourly interval.
 */
export async function runFullBatch(orgId: string): Promise<BatchRunResult> {
  const tickets = await listHdTicketsForSentiment({ orgId, staleOnly: false });
  return processTicketList(orgId, tickets);
}

/**
 * Runs sentiment analysis for each ticket in the list.
 */
async function processTicketList(
  orgId: string,
  tickets: SupportTicketRecord[],
): Promise<BatchRunResult> {
  const result: BatchRunResult = {
    examined: tickets.length,
    analyzed: 0,
    skipped: 0,
    errors: 0,
  };

  for (const ticket of tickets) {
    try {
      const analysis = await analyzeHdTicketSentiment(orgId, ticket);
      if (analysis === null) {
        result.skipped += 1;
        continue;
      }
      const updated = await updateTicketSentiment(orgId, ticket.ticketId, analysis);
      await notifyChurnRiskIfNeeded(orgId, updated, analysis.churnRisk);
      result.analyzed += 1;
    } catch {
      result.errors += 1;
    }
  }

  return result;
}
