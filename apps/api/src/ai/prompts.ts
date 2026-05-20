import type { CommentDraftTone } from '@usd/shared-types';
import type { AiTicketContext } from './types.js';
import { formatContextForPrompt } from './formatContextForPrompt.js';

/**
 * Builds the user prompt for triage_suggest (model must return JSON only).
 */
export function buildTriageSuggestPrompt(ctx: AiTicketContext): string {
  const context = formatContextForPrompt(ctx);
  return [
    'You are a support engineering lead. Analyze the ticket and conversation below.',
    'Respond with ONLY a JSON object (no markdown) matching this shape:',
    '{"engineerAction":"string","riskLevel":"LOW|MED|HIGH","riskReason":"string","suggestedAssignee":"optional string"}',
    '',
    context,
  ].join('\n');
}

/**
 * Builds the user prompt for comment_draft (model must return JSON only).
 */
/**
 * Builds the user prompt for Helpdesk sentiment batch analysis (JSON only).
 */
export function buildSentimentAnalysisPrompt(ctx: AiTicketContext): string {
  const context = formatContextForPrompt(ctx);
  return [
    'You analyze customer support conversations for sentiment and churn risk.',
    'Respond with ONLY a JSON object (no markdown):',
    '{"sentiment":"positive|neutral|negative","sentimentScore":-1.0 to 1.0,"churnRisk":true|false}',
    'sentimentScore: -1 very negative, 0 neutral, +1 very positive.',
    '',
    context,
  ].join('\n');
}

/**
 * Builds the user prompt for the manager morning briefing (plain text bullets).
 */
export function buildMorningBriefingPrompt(summaryText: string): string {
  return [
    'You are a support operations manager. Write an executive morning briefing.',
    'Use exactly 5 bullet points (plain text, each starting with •).',
    'Cover: overall health, top at-risk accounts, sentiment trend, SLA/critical tickets, one recommended action.',
    '',
    'Org metrics:',
    summaryText,
  ].join('\n');
}

export function buildCommentDraftPrompt(ctx: AiTicketContext, tone: CommentDraftTone): string {
  const context = formatContextForPrompt(ctx);
  return [
    `You are drafting a ${tone} support reply for the primary ticket.`,
    'Respond with ONLY a JSON object (no markdown):',
    `{"draft":"string","tone":"${tone}"}`,
    '',
    context,
  ].join('\n');
}
