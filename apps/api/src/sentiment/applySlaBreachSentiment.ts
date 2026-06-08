import type { SentimentAnalysisResult, TicketApiDto } from '@usd/shared-types';
import { estimateSlaPercentRemaining } from '../utils/sla.js';

/**
 * Upgrades sentiment to negative when an open Helpdesk ticket has fully breached SLA (past due).
 * Conversation tone may still be neutral/positive; SLA breach is treated as elevated churn risk.
 */
export function applySlaBreachSentiment(
  ticket: Pick<TicketApiDto, 'status' | 'createdAt' | 'slaDueAt' | 'priority'>,
  result: SentimentAnalysisResult,
  nowMs: number = Date.now(),
): SentimentAnalysisResult {
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return result;
  }
  const dueAt = ticket.slaDueAt?.trim();
  if (dueAt === undefined || dueAt.length === 0) {
    return result;
  }
  const pct = estimateSlaPercentRemaining(ticket.createdAt, dueAt, nowMs);
  if (pct === null || pct > 0) {
    return result;
  }
  const breachedScore = Math.min(result.sentimentScore, -0.55);
  const churnRisk =
    result.churnRisk ||
    ticket.priority === 'critical' ||
    ticket.priority === 'high' ||
    ticket.priority === 'medium';
  return {
    sentiment: 'negative',
    sentimentScore: breachedScore,
    churnRisk,
  };
}
