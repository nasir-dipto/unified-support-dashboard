import { describe, expect, it, vi } from 'vitest';
import * as tickets from '../db/tables/tickets.js';
import { buildBriefingContext } from './buildBriefingContext.js';

describe('buildBriefingContext', () => {
  it('returns summary and prompt text', async () => {
    vi.spyOn(tickets, 'listHdTicketsWithSentiment').mockResolvedValue([
      {
        ticketId: 'hd_1',
        orgId: 'o',
        source: 'helpdesk',
        externalId: '1',
        summary: 'S',
        priority: 'critical',
        status: 'open',
        createdAt: 't',
        updatedAt: 't',
        sentiment: 'negative',
        sentimentScore: -0.5,
        churnRisk: true,
        sentimentAt: '2026-05-10T00:00:00.000Z',
      },
    ]);
    const ctx = await buildBriefingContext('o');
    expect(ctx.summary.total).toBe(1);
    expect(ctx.promptText).toContain('Helpdesk tickets');
  });
});
