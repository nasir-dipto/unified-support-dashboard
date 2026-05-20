import {
  sentimentAnalysisResultSchema,
  type SentimentAnalysisResult,
  type SupportTicketRecord,
} from '@usd/shared-types';
import { buildAiTicketContext } from '../ai/buildTicketContext.js';
import { mockSentimentAnalysis } from '../ai/mockResponses.js';
import { buildSentimentAnalysisPrompt } from '../ai/prompts.js';
import { isEligibleForSentimentAnalysis } from '../sentiment/eligibility.js';
import { invokeBedrockJson, isMockAiEnabled } from './bedrock.service.js';
import { AppError } from '../utils/errors.js';

/**
 * Returns false when the ticket was analyzed within the last hour.
 */
export function shouldAnalyzeSentiment(
  ticket: SupportTicketRecord,
  nowMs: number = Date.now(),
): boolean {
  if (ticket.source !== 'helpdesk') {
    return false;
  }
  return isEligibleForSentimentAnalysis(ticket.sentimentAt, nowMs);
}

/**
 * Analyzes one Helpdesk ticket conversation (mock or Bedrock). Jira tickets are rejected.
 */
export async function analyzeHdTicketSentiment(
  orgId: string,
  ticket: SupportTicketRecord,
): Promise<SentimentAnalysisResult | null> {
  if (ticket.source !== 'helpdesk') {
    throw new AppError('Sentiment applies to Helpdesk tickets only', 'VALIDATION', 400);
  }
  if (!shouldAnalyzeSentiment(ticket)) {
    return null;
  }

  const ctx = await buildAiTicketContext(orgId, ticket.ticketId);

  if (isMockAiEnabled()) {
    return mockSentimentAnalysis({
      ticket: ctx.ticket,
      commentCount: ctx.comments.length,
    });
  }

  const prompt = buildSentimentAnalysisPrompt(ctx);
  const raw = await invokeBedrockJson(prompt);
  return sentimentAnalysisResultSchema.parse(raw);
}
