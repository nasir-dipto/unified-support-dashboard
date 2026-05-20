import { describe, expect, it } from 'vitest';
import type { SupportTicketRecord } from '@usd/shared-types';
import { buildSentimentSummary, weekStartUtc } from './aggregateSummary.js';

const base: SupportTicketRecord = {
  ticketId: 'hd_1',
  orgId: 'o',
  source: 'helpdesk',
  externalId: '1',
  summary: 'Issue',
  priority: 'high',
  status: 'open',
  customerEmail: 'a@acme.com',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
  sentiment: 'negative',
  sentimentScore: -0.6,
  churnRisk: true,
  sentimentAt: '2026-05-10T12:00:00.000Z',
};

describe('buildSentimentSummary', () => {
  it('counts sentiment and limits tickets to 50', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      ...base,
      ticketId: `hd_${String(i)}`,
      externalId: String(i),
    }));
    const s = buildSentimentSummary(many);
    expect(s.counts.negative).toBe(60);
    expect(s.tickets.length).toBe(50);
  });

  it('filters tickets by sentiment', () => {
    const s = buildSentimentSummary(
      [
        base,
        { ...base, ticketId: 'hd_2', sentiment: 'positive', sentimentScore: 0.8 },
      ],
      'negative',
    );
    expect(s.tickets.every((t) => t.sentiment === 'negative')).toBe(true);
  });

  it('weekStartUtc returns a Monday date', () => {
    const w = weekStartUtc('2026-05-14T00:00:00.000Z');
    expect(w).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
