import { afterEach, describe, expect, it, vi } from 'vitest';
import * as bedrock from '../services/bedrock.service.js';
import { runMorningBriefing } from './briefing.js';

const summary = {
  counts: { positive: 2, neutral: 1, negative: 3, unanalyzed: 0 },
  trend: [],
  byCustomer: [],
  byPriority: [],
  tickets: [
    {
      ticketId: 'hd_1',
      externalId: '1',
      summary: 'S',
      priority: 'critical' as const,
      status: 'open' as const,
      sentiment: 'negative' as const,
      sentimentScore: -0.5,
      churnRisk: true,
      sentimentAt: 't',
      createdAt: 't',
      updatedAt: 't',
    },
  ],
  total: 6,
};

describe('runMorningBriefing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mock briefing when USE_MOCK_AI', async () => {
    vi.spyOn(bedrock, 'isMockAiEnabled').mockReturnValue(true);
    const res = await runMorningBriefing(summary, 'metrics');
    expect(res.briefing).toContain('•');
  });
});
