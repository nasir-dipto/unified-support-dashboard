import { afterEach, describe, expect, it, vi } from 'vitest';
import * as comments from '../db/tables/comments.js';
import * as helpdeskService from '../services/helpdesk.service.js';
import { syncRequestConversations } from './syncRequestConversations.js';

describe('syncRequestConversations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('upserts mapped conversations', async () => {
    vi.spyOn(helpdeskService, 'fetchRequestConversations').mockResolvedValue({
      conversations: [
        {
          id: '55',
          type: 'NOTES',
          description: 'note',
          created_time: '2026-01-01T00:00:00Z',
        },
      ],
    });
    const upsert = vi.spyOn(comments, 'upsertTicketComment').mockResolvedValue({
      commentId: 'hd_55',
      ticketId: 'hd_1',
      body: 'note',
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
  });
});
