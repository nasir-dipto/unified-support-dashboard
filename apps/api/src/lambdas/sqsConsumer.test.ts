import { afterEach, describe, expect, it, vi } from 'vitest';
import { processHelpdeskWebhookJson, processJiraWebhookJson } from './sqsConsumer.js';
import * as tickets from '../db/tables/tickets.js';

describe('sqsConsumer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
  });

  describe('processHelpdeskWebhookJson', () => {
    it('upserts mapped ticket from wrapped request', async () => {
      const spy = vi.spyOn(tickets, 'upsertTicket').mockResolvedValue({
        ticketId: 'hd_99',
        orgId: 'o',
        source: 'helpdesk',
        externalId: '99',
        summary: 'Printer',
        priority: 'medium',
        status: 'open',
        createdAt: 't',
        updatedAt: 't',
      });
      await processHelpdeskWebhookJson(
        {
          request: {
            id: '4445000000190099',
            display_id: { value: '99', display_value: 'REQ-99' },
            subject: 'Printer',
            priority: { name: 'Medium' },
            status: { name: 'Open' },
          },
        },
        'o',
      );
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]?.[0]?.ticketId).toBe('hd_99');
      expect(spy.mock.calls[0]?.[0]?.internalId).toBe('4445000000190099');
    });

    it('throws when request missing', async () => {
      await expect(processHelpdeskWebhookJson({}, 'o')).rejects.toThrow();
    });
  });
});
