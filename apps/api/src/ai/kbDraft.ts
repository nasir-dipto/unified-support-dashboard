import { kbDraftResponseSchema, type KbDraftResponse } from '@usd/shared-types';
import { invokeBedrockJson, isMockAiEnabled } from '../services/bedrock.service.js';
import { degradedKbDraft, mockKbDraft } from './mockResponses.js';
import { buildKbDraftPrompt } from './prompts.js';
import type { AiTicketContext } from './types.js';

/**
 * Runs kb_draft for a ticket context (mock or Bedrock). Does not persist.
 */
export async function runKbDraft(ctx: AiTicketContext): Promise<KbDraftResponse> {
  if (isMockAiEnabled()) {
    return mockKbDraft({ ticket: ctx.ticket, linkedTicketId: ctx.linked?.ticket.ticketId });
  }

  const prompt = buildKbDraftPrompt(ctx);
  try {
    const raw = await invokeBedrockJson(prompt);
    const parsed = kbDraftResponseSchema.parse(raw);
    const ids = new Set(parsed.sourceTicketIds);
    ids.add(ctx.ticket.ticketId);
    if (ctx.linked !== undefined) {
      ids.add(ctx.linked.ticket.ticketId);
    }
    return { ...parsed, sourceTicketIds: [...ids] };
  } catch {
    return degradedKbDraft({
      ticket: ctx.ticket,
      linkedTicketId: ctx.linked?.ticket.ticketId,
    });
  }
}
