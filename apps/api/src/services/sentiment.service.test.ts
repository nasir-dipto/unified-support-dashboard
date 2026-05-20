import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupportTicketRecord } from '@usd/shared-types';
import * as bedrock from './bedrock.service.js';
import * as buildCtx from '../ai/buildTicketContext.js';
import { analyzeHdTicketSentiment, shouldAnalyzeSentiment } from './sentiment.service.js';

const hdTicket: SupportTicketRecord = {
  ticketId: 'hd_1',
  orgId: 'demo-org',
  source: 'helpdesk',
  externalId: '1',
  summary: 'Cannot login frustrated',
  priority: 'high',
  status: 'open',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('sentiment.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shouldAnalyzeSentiment rejects Jira', () => {
    expect(
      shouldAnalyzeSentiment({
        ...hdTicket,
        ticketId: 'jira_X',
        source: 'jira',
      }),
    ).toBe(false);
  });

  it('returns mock sentiment when USE_MOCK_AI', async () => {
    vi.spyOn(bedrock, 'isMockAiEnabled').mockReturnValue(true);
    vi.spyOn(buildCtx, 'buildAiTicketContext').mockResolvedValue({
      ticket: { ...hdTicket },
      comments: [{ commentId: 'c', ticketId: 'hd_1', body: 'help', commentSource: 'hd_email', createdAt: 't' }],
      linked: undefined,
    });
    const res = await analyzeHdTicketSentiment('demo-org', hdTicket);
    expect(res?.sentiment).toBe('negative');
  });

  it('returns null when within hourly interval', async () => {
    const recent = {
      ...hdTicket,
      sentimentAt: new Date().toISOString(),
    };
    const res = await analyzeHdTicketSentiment('demo-org', recent);
    expect(res).toBeNull();
  });
});
