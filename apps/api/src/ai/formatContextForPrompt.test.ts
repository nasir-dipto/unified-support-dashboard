import { describe, expect, it } from 'vitest';
import { formatContextForPrompt } from './formatContextForPrompt.js';
const baseTicket = {
  ticketId: 'jira_X',
  orgId: 'o',
  source: 'jira' as const,
  externalId: 'X',
  summary: 'Bug',
  priority: 'high' as const,
  status: 'open' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('formatContextForPrompt', () => {
  it('includes primary ticket and thread', () => {
    const text = formatContextForPrompt({
      ticket: baseTicket,
      comments: [
        {
          commentId: 'c1',
          ticketId: 'jira_X',
          body: 'Hello',
          commentSource: 'jira_comment',
          createdAt: '2026-01-02T00:00:00Z',
        },
      ],
      linked: undefined,
    });
    expect(text).toContain('Primary ticket');
    expect(text).toContain('jira_comment');
    expect(text).toContain('Hello');
  });

  it('includes linked ticket section when present', () => {
    const text = formatContextForPrompt({
      ticket: { ...baseTicket, linkedTicketId: 'hd_1' },
      comments: [],
      linked: {
        ticket: {
          ...baseTicket,
          ticketId: 'hd_1',
          source: 'helpdesk',
          externalId: '1',
        },
        comments: [],
      },
    });
    expect(text).toContain('Linked ticket');
    expect(text).toContain('hd_1');
  });
});
