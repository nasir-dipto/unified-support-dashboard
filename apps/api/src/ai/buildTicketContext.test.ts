import { afterEach, describe, expect, it, vi } from 'vitest';
import * as tickets from '../db/tables/tickets.js';
import * as comments from '../db/tables/comments.js';
import { buildAiTicketContext } from './buildTicketContext.js';

describe('buildAiTicketContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads ticket and comments without linked block', async () => {
    vi.spyOn(tickets, 'getTicketById').mockResolvedValue({
      ticketId: 'jira_A',
      orgId: 'o',
      source: 'jira',
      externalId: 'A',
      summary: 'S',
      priority: 'low',
      status: 'open',
      createdAt: 't',
      updatedAt: 't',
    });
    vi.spyOn(comments, 'listTicketComments').mockResolvedValue({
      items: [
        {
          commentId: 'c1',
          ticketId: 'jira_A',
          body: 'Hi',
          commentSource: 'jira_comment',
          createdAt: 't2',
        },
      ],
      total: 1,
    });
    const ctx = await buildAiTicketContext('o', 'jira_A');
    expect(ctx.ticket.ticketId).toBe('jira_A');
    expect(ctx.comments).toHaveLength(1);
    expect(ctx.linked).toBeUndefined();
  });

  it('loads linked ticket when linkedTicketId is set', async () => {
    vi.spyOn(tickets, 'getTicketById')
      .mockResolvedValueOnce({
        ticketId: 'jira_A',
        orgId: 'o',
        source: 'jira',
        externalId: 'A',
        summary: 'S',
        priority: 'low',
        status: 'open',
        linkedTicketId: 'hd_1',
        createdAt: 't',
        updatedAt: 't',
      })
      .mockResolvedValueOnce({
        ticketId: 'hd_1',
        orgId: 'o',
        source: 'helpdesk',
        externalId: '1',
        summary: 'HD',
        priority: 'medium',
        status: 'open',
        createdAt: 't',
        updatedAt: 't',
      });
    vi.spyOn(comments, 'listTicketComments').mockResolvedValue({ items: [], total: 0 });
    const ctx = await buildAiTicketContext('o', 'jira_A');
    expect(ctx.linked?.ticket.ticketId).toBe('hd_1');
  });
});
