import { describe, expect, it } from 'vitest';
import type { TicketApiDto, TicketCommentApiDto } from '@usd/shared-types';
import {
  canWriteMergedIncident,
  mergeThreadComments,
  resolveJiraAndHdTickets,
} from './merged-incident.js';

const jira: TicketApiDto = {
  ticketId: 'jira_1',
  orgId: 'o',
  source: 'jira',
  externalId: '1',
  summary: 'Jira',
  priority: 'high',
  status: 'open',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  assigneeId: 'dev@usd.dev',
};

const hd: TicketApiDto = {
  ticketId: 'hd_1',
  orgId: 'o',
  source: 'helpdesk',
  externalId: '1',
  summary: 'HD',
  priority: 'medium',
  status: 'open',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  assigneeId: 'Nasir Dipto Personal',
};

describe('merged-incident', () => {
  it('resolveJiraAndHdTickets orders by source', () => {
    expect(resolveJiraAndHdTickets(jira, hd)).toEqual({ jira, hd });
    expect(resolveJiraAndHdTickets(hd, jira)).toEqual({ jira, hd });
  });

  it('mergeThreadComments sorts by createdAt', () => {
    const a: TicketCommentApiDto = {
      ticketId: 'jira_1',
      commentId: 'c1',
      body: 'late',
      commentSource: 'jira_comment',
      createdAt: '2026-01-02T00:00:00.000Z',
    };
    const b: TicketCommentApiDto = {
      ticketId: 'hd_1',
      commentId: 'c2',
      body: 'early',
      commentSource: 'hd_note',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const merged = mergeThreadComments([a], [b]);
    expect(merged[0]?.body).toBe('early');
    expect(merged[1]?.body).toBe('late');
  });

  it('canWriteMergedIncident when technician assigned to HD only', () => {
    const user = {
      userId: 't1',
      orgId: 'o',
      email: 'technician@usd.dev',
      roles: ['technician' as const],
      displayName: 'Nasir Dipto Personal',
    };
    expect(
      canWriteMergedIncident(
        user,
        { ...jira, assigneeId: 'other' },
        hd,
      ),
    ).toBe(true);
  });
});
