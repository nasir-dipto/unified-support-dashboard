import { afterEach, describe, expect, it, vi } from 'vitest';
import * as bedrock from '../services/bedrock.service.js';
import { runTriageSuggest } from './triage.js';
import type { AiTicketContext } from './types.js';

const ctx: AiTicketContext = {
  ticket: {
    ticketId: 'jira_A',
    orgId: 'o',
    source: 'jira',
    externalId: 'A',
    summary: 'Login',
    priority: 'critical',
    status: 'open',
    createdAt: 't',
    updatedAt: 't',
  },
  comments: [{ commentId: 'c', ticketId: 'jira_A', body: 'x', commentSource: 'jira_comment', createdAt: 't' }],
  linked: undefined,
};

describe('runTriageSuggest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mock triage when USE_MOCK_AI', async () => {
    vi.spyOn(bedrock, 'isMockAiEnabled').mockReturnValue(true);
    const res = await runTriageSuggest(ctx);
    expect(res.engineerAction).toContain('A');
    expect(res.riskLevel).toBe('HIGH');
  });

  it('returns degraded response when Bedrock fails', async () => {
    vi.spyOn(bedrock, 'isMockAiEnabled').mockReturnValue(false);
    vi.spyOn(bedrock, 'invokeBedrockJson').mockRejectedValue(new Error('timeout'));
    const res = await runTriageSuggest(ctx);
    expect(res.degraded).toBe(true);
    expect(res.engineerAction).toContain('unavailable');
  });
});
