import { describe, expect, it } from 'vitest';
import type { SupportTicketRecord } from '@usd/shared-types';
import { aggregateVolumeTrend } from './aggregateVolume.js';

describe('aggregateVolumeTrend', () => {
  it('counts tickets by day and source', () => {
    const now = new Date('2026-05-07T12:00:00.000Z').getTime();
    const tickets: SupportTicketRecord[] = [
      {
        ticketId: 'jira_A',
        orgId: 'o',
        source: 'jira',
        externalId: 'A',
        summary: 'a',
        priority: 'low',
        status: 'open',
        createdAt: '2026-05-06T10:00:00.000Z',
        updatedAt: '2026-05-06T10:00:00.000Z',
      },
      {
        ticketId: 'hd_1',
        orgId: 'o',
        source: 'helpdesk',
        externalId: '1',
        summary: 'b',
        priority: 'medium',
        status: 'open',
        createdAt: '2026-05-06T11:00:00.000Z',
        updatedAt: '2026-05-06T11:00:00.000Z',
      },
    ];
    const points = aggregateVolumeTrend(tickets, 7, now);
    const may6 = points.find((p) => p.date === '2026-05-06');
    expect(may6?.jira).toBe(1);
    expect(may6?.helpdesk).toBe(1);
    expect(may6?.total).toBe(2);
  });

  it('includes today in the last bucket for a 7-day window', () => {
    const now = new Date('2026-05-21T15:00:00.000Z').getTime();
    const tickets: SupportTicketRecord[] = [
      {
        ticketId: 'jira_TODAY',
        orgId: 'o',
        source: 'jira',
        externalId: 'TODAY',
        summary: 'today',
        priority: 'low',
        status: 'open',
        createdAt: '2026-05-21T10:00:00.000Z',
        updatedAt: '2026-05-21T10:00:00.000Z',
      },
    ];
    const points = aggregateVolumeTrend(tickets, 7, now);
    const today = points.find((p) => p.date === '2026-05-21');
    expect(today?.jira).toBe(1);
    expect(points).toHaveLength(7);
  });
});
