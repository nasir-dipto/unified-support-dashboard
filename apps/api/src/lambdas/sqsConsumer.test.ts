import { afterEach, describe, expect, it, vi } from 'vitest';
import { processJiraWebhookJson } from './sqsConsumer.js';
import * as tickets from '../db/tables/tickets.js';

describe('processJiraWebhookJson', () => {
  it('upserts mapped ticket', async () => {
    const spy = vi.spyOn(tickets, 'upsertTicket').mockResolvedValue({
      ticketId: 'jira_K-1',
      orgId: 'o',
      source: 'jira',
      externalId: 'K-1',
      summary: 's',
      priority: 'medium',
      status: 'open',
      createdAt: 't',
      updatedAt: 't',
    });
    await processJiraWebhookJson(
      {
        issue: {
          key: 'K-1',
          fields: { summary: 's', priority: { name: 'Medium' }, status: { name: 'To Do' } },
        },
      },
      'o',
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]?.ticketId).toBe('jira_K-1');
  });

  it('throws when issue missing', async () => {
    await expect(processJiraWebhookJson({}, 'o')).rejects.toThrow();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
