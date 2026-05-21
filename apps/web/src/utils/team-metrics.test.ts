import { describe, expect, it } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import { aggregateTeamByAssignee, averagePriorityLabel, hasAssignedTickets } from './team-metrics';

const base: TicketApiDto = {
  ticketId: 'jira_1',
  orgId: 'o',
  source: 'jira',
  externalId: '1',
  summary: 'x',
  priority: 'medium',
  status: 'open',
  createdAt: 't',
  updatedAt: 't',
};

describe('team-metrics', () => {
  it('hasAssignedTickets is false when all unassigned', () => {
    expect(hasAssignedTickets([{ ...base, assigneeId: undefined }])).toBe(false);
  });

  it('aggregateTeamByAssignee counts open and resolved', () => {
    const rows = aggregateTeamByAssignee([
      { ...base, ticketId: 'a', assigneeId: 'tech1', status: 'open', priority: 'high' },
      { ...base, ticketId: 'b', assigneeId: 'tech1', status: 'closed', priority: 'low' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.assigned).toBe(2);
    expect(rows[0]?.open).toBe(1);
    expect(rows[0]?.resolved).toBe(1);
  });

  it('averagePriorityLabel rounds ordinal mean', () => {
    expect(averagePriorityLabel(['low', 'critical'])).toBe('high');
  });
});
