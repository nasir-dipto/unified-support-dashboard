import { afterEach, describe, expect, it, vi } from 'vitest';
import * as comments from '../db/tables/comments.js';
import * as helpdeskService from '../services/helpdesk.service.js';
import { syncRequestConversations } from './syncRequestConversations.js';

describe('syncRequestConversations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges notes description into conversation rows before upsert', async () => {
    vi.spyOn(helpdeskService, 'fetchRequestConversations').mockResolvedValue({
      conversations: [
        {
          id: '55',
          type: 'NOTES',
          created_time: '2026-01-01T00:00:00Z',
        },
      ],
    });
    vi.spyOn(helpdeskService, 'fetchRequestNotes').mockResolvedValue({
      notes: [
        {
          id: '55',
          description: 'note body from notes endpoint',
          created_time: '2026-01-01T00:00:00Z',
        },
      ],
    });
    vi.spyOn(comments, 'listTicketComments').mockResolvedValue({ items: [], total: 0 });
    const upsert = vi.spyOn(comments, 'upsertTicketComment').mockResolvedValue({
      commentId: 'hd_55',
      ticketId: 'hd_1',
      body: 'note body from notes endpoint',
      commentSource: 'hd_note',
      createdAt: 't',
    });
    const n = await syncRequestConversations({
      orgId: 'o',
      ticketId: 'hd_1',
      internalId: '4445000000000001',
    });
    expect(n).toBe(1);
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0]?.[0];
    expect(arg?.body).toBe('note body from notes endpoint');
  });
});
