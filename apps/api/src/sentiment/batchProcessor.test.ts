import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupportTicketRecord } from '@usd/shared-types';
import * as tickets from '../db/tables/tickets.js';
import * as sentimentSvc from '../services/sentiment.service.js';
import { runIncrementalBatch } from './batchProcessor.js';

const hd: SupportTicketRecord = {
  ticketId: 'hd_1',
  orgId: 'o',
  source: 'helpdesk',
  externalId: '1',
  summary: 'Test',
  priority: 'medium',
  status: 'open',
  createdAt: 't',
  updatedAt: 't',
  sentimentStale: true,
};

describe('runIncrementalBatch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('analyzes and persists stale HD tickets', async () => {
    vi.spyOn(tickets, 'listHdTicketsForSentiment').mockResolvedValue([hd]);
    vi.spyOn(sentimentSvc, 'analyzeHdTicketSentiment').mockResolvedValue({
      sentiment: 'neutral',
      sentimentScore: 0,
      churnRisk: false,
    });
    const update = vi.spyOn(tickets, 'updateTicketSentiment').mockResolvedValue(hd);
    const res = await runIncrementalBatch('o');
    expect(res.analyzed).toBe(1);
    expect(update).toHaveBeenCalled();
  });
});
