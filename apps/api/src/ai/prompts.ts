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
