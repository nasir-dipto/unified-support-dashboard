import {
  triageSuggestResponseSchema,
  type TriageSuggestResponse,
} from '@usd/shared-types';
import { invokeBedrockJson, isMockAiEnabled } from '../services/bedrock.service.js';
import {
  degradedTriageSuggest,
  mockTriageSuggest,
} from './mockResponses.js';
import { buildTriageSuggestPrompt } from './prompts.js';
import type { AiTicketContext } from './types.js';

/**
 * Runs triage_suggest for a ticket context (mock or Bedrock).
 */
export async function runTriageSuggest(ctx: AiTicketContext): Promise<TriageSuggestResponse> {
  if (isMockAiEnabled()) {
    return mockTriageSuggest({
      ticket: ctx.ticket,
      commentCount: ctx.comments.length,
    });
  }

  const prompt = buildTriageSuggestPrompt(ctx);
  try {
    const raw = await invokeBedrockJson(prompt);
    return triageSuggestResponseSchema.parse(raw);
  } catch {
    return degradedTriageSuggest();
  }
}
