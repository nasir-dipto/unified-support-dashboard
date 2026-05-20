import {
  commentDraftResponseSchema,
  type CommentDraftResponse,
  type CommentDraftTone,
} from '@usd/shared-types';
import { invokeBedrockJson, isMockAiEnabled } from '../services/bedrock.service.js';
import {
  degradedCommentDraft,
  mockCommentDraft,
} from './mockResponses.js';
import { buildCommentDraftPrompt } from './prompts.js';
import type { AiTicketContext } from './types.js';

/**
 * Runs comment_draft for a ticket context (mock or Bedrock).
 */
export async function runCommentDraft(
  ctx: AiTicketContext,
  tone: CommentDraftTone,
): Promise<CommentDraftResponse> {
  if (isMockAiEnabled()) {
    return mockCommentDraft({
      ticket: ctx.ticket,
      tone,
      commentCount: ctx.comments.length,
    });
  }

  const prompt = buildCommentDraftPrompt(ctx, tone);
  try {
    const raw = await invokeBedrockJson(prompt);
    const parsed = commentDraftResponseSchema.parse({ ...raw, tone });
    return parsed;
  } catch {
    return degradedCommentDraft(tone);
  }
}
