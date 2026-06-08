import { describe, expect, it } from 'vitest';
import type { WsOutboundEnvelope } from '@usd/shared-types';
import {
  filterActivityEventsBySource,
  formatActivityTicketDisplayId,
  formatTimeAgo,
  getActivityEventAttribution,
  isActionRequired,
  isCustomerCommentAuthor,
} from './activity-feed';

const now = new Date('2026-06-08T12:00:00.000Z').getTime();

function ticketEvent(
  overrides: Partial<WsOutboundEnvelope> & { ticket?: Record<string, unknown> },
): WsOutboundEnvelope {
  const { ticket, ...rest } = overrides;
  return {
    type: 'ticket_updated',
    ticketId: 'hd_501',
    orgId: 'ti',
    payload: ticket !== undefined ? { ticket } : {},
    ...rest,
  };
}

describe('formatTimeAgo', () => {
  it('formats minutes, hours, and days', () => {
    expect(formatTimeAgo('2026-06-08T11:55:00.000Z', now)).toBe('5 min ago');
    expect(formatTimeAgo('2026-06-08T10:00:00.000Z', now)).toBe('2h ago');
    expect(formatTimeAgo('2026-06-06T12:00:00.000Z', now)).toBe('2d ago');
  });

  it('returns just now for sub-minute deltas', () => {
    expect(formatTimeAgo('2026-06-08T11:59:30.000Z', now)).toBe('just now');
  });
});

describe('isActionRequired', () => {
  it('flags high priority open tickets', () => {
    expect(
      isActionRequired(
        ticketEvent({
          ticket: { source: 'helpdesk', externalId: '1', priority: 'high', status: 'open' },
        }),
      ),
    ).toBe(true);
  });

  it('never flags resolved or closed tickets', () => {
    expect(
      isActionRequired(
        ticketEvent({
          ticket: { source: 'helpdesk', externalId: '1', priority: 'critical', status: 'closed' },
        }),
      ),
    ).toBe(false);
  });

  it('flags negative sentiment and churn risk', () => {
    expect(
      isActionRequired(
        ticketEvent({
          ticket: { source: 'helpdesk', externalId: '1', status: 'open', sentiment: 'negative' },
        }),
      ),
    ).toBe(true);
    expect(
      isActionRequired(
        ticketEvent({
          ticket: { source: 'helpdesk', externalId: '1', status: 'in_progress', churnRisk: true },
        }),
      ),
    ).toBe(true);
  });

  it('flags customer comments awaiting response', () => {
    expect(
      isActionRequired({
        type: 'comment_added',
        ticketId: 'hd_9',
        orgId: 'ti',
        payload: {
          ticket: {
            source: 'helpdesk',
            externalId: '9',
            status: 'open',
            customerEmail: 'user@example.com',
          },
          commentSource: 'hd_email',
          authorEmail: 'user@example.com',
          body: 'Need help',
        },
      }),
    ).toBe(true);
  });
});

describe('isCustomerCommentAuthor', () => {
  it('detects hd_email and matching customer email', () => {
    const event: WsOutboundEnvelope = {
      type: 'comment_added',
      ticketId: 'hd_9',
      orgId: 'ti',
      payload: {
        commentSource: 'hd_email',
        authorEmail: 'user@example.com',
        ticket: { customerEmail: 'user@example.com' },
      },
    };
    expect(isCustomerCommentAuthor(event)).toBe(true);
  });
});

describe('getActivityEventAttribution', () => {
  it('shows customer attribution on customer comments', () => {
    const line = getActivityEventAttribution({
      type: 'comment_added',
      ticketId: 'hd_9',
      orgId: 'ti',
      payload: {
        commentSource: 'hd_email',
        authorEmail: 'user@example.com',
        ticket: { customerEmail: 'user@example.com' },
      },
    });
    expect(line).toBe('by user@example.com (Customer)');
  });

  it('shows assignee on ticket_updated when present', () => {
    const line = getActivityEventAttribution(
      ticketEvent({
        ticket: { assigneeId: 'tech@usd.dev', status: 'open' },
      }),
    );
    expect(line).toBe('by tech@usd.dev');
  });
});

describe('filterActivityEventsBySource', () => {
  const events: WsOutboundEnvelope[] = [
    ticketEvent({ ticketId: 'jira_SUP-1', ticket: { source: 'jira', externalId: 'SUP-1' } }),
    ticketEvent({ ticketId: 'hd_2', ticket: { source: 'helpdesk', externalId: '2' } }),
  ];

  it('filters jira and helpdesk sources', () => {
    expect(filterActivityEventsBySource(events, 'jira')).toHaveLength(1);
    expect(filterActivityEventsBySource(events, 'me')).toHaveLength(1);
    expect(filterActivityEventsBySource(events, 'all')).toHaveLength(2);
  });
});

describe('formatActivityTicketDisplayId', () => {
  it('formats helpdesk and jira ids from snapshot', () => {
    expect(
      formatActivityTicketDisplayId(
        ticketEvent({ ticketId: 'hd_501', ticket: { source: 'helpdesk', externalId: '501' } }),
      ),
    ).toBe('HD-501');
    expect(
      formatActivityTicketDisplayId(
        ticketEvent({ ticketId: 'jira_SUP-99', ticket: { source: 'jira', externalId: 'SUP-99' } }),
      ),
    ).toBe('SUP-99');
  });
});
