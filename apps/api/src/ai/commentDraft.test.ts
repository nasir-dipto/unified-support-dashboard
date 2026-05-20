import { afterEach, describe, expect, it, vi } from 'vitest';
import * as bedrock from '../services/bedrock.service.js';
import { runCommentDraft } from './commentDraft.js';
import type { AiTicketContext } from './types.js';

const ctx: AiTicketContext = {
  ticket: {
    ticketId: 'hd_1',
    orgId: 'o',
    source: 'helpdesk',
    externalId: '1',
    summary: 'Printer',
    priority: 'medium',
    status: 'open',
    createdAt: 't',
    updatedAt: 't',
  },
  comments: [],
  linked: undefined,
};

describe('runCommentDraft', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mock draft when USE_MOCK_AI', async () => {
    vi.spyOn(bedrock, 'isMockAiEnabled').mockReturnValue(true);
    const res = await runCommentDraft(ctx, 'professional');
    expect(res.tone).toBe('professional');
    expect(res.draft.length).toBeGreaterThan(10);
  });

  it('returns degraded draft when Bedrock fails', async () => {
    vi.spyOn(bedrock, 'isMockAiEnabled').mockReturnValue(false);
    vi.spyOn(bedrock, 'invokeBedrockJson').mockRejectedValue(new Error('fail'));
    const res = await runCommentDraft(ctx, 'technical');
    expect(res.degraded).toBe(true);
    expect(res.tone).toBe('technical');
  });
});
