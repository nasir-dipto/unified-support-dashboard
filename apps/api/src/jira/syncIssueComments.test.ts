import { afterEach, describe, expect, it, vi } from 'vitest';
import * as comments from '../db/tables/comments.js';
import * as jiraService from '../services/jira.service.js';
import { buildJiraSyncedCommentId, syncIssueComments } from './syncIssueComments.js';

describe('syncIssueComments', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('upserts mapped comments from Jira API', async () => {
    vi.spyOn(jiraService, 'fetchIssueComments').mockResolvedValue({
      comments: [
        {
          id: '1',
          created: '2026-01-01T00:00:00Z',
          body: { type: 'doc', version: 1, content: [] },
        },
      ],
      total: 1,
    });
    vi.spyOn(comments, 'listTicketComments').mockResolvedValue({ items: [], total: 0 });
    const upsert = vi.spyOn(comments, 'upsertTicketComment').mockResolvedValue({
      commentId: 'jira_1',
      ticketId: 'jira_K',
      body: 'x',
      commentSource: 'jira_comment',
      createdAt: 't',
    });
    const n = await syncIssueComments({
      orgId: 'o',
      ticketId: 'jira_K',
      issueKey: 'K',
    });
    expect(n).toBe(1);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('skips duplicate source ids in the same sync run', async () => {
    vi.spyOn(jiraService, 'fetchIssueComments').mockResolvedValue({
      comments: [
        { id: '9', created: '2026-01-01T00:00:00Z', body: { type: 'doc', version: 1, content: [] } },
        { id: '9', created: '2026-01-02T00:00:00Z', body: { type: 'doc', version: 1, content: [] } },
      ],
      total: 2,
    });
    vi.spyOn(comments, 'listTicketComments').mockResolvedValue({ items: [], total: 0 });
    const upsert = vi.spyOn(comments, 'upsertTicketComment').mockResolvedValue({
      commentId: 'jira_9',
      ticketId: 'jira_K',
      body: 'x',
      commentSource: 'jira_comment',
      createdAt: 't',
    });
    const n = await syncIssueComments({
      orgId: 'o',
      ticketId: 'jira_K',
      issueKey: 'K',
    });
    expect(n).toBe(1);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('removes usd_comment mirror when Jira comment body matches', async () => {
    vi.spyOn(jiraService, 'fetchIssueComments').mockResolvedValue({
      comments: [
        {
          id: '10000',
          created: '2026-01-01T00:00:00Z',
          body: {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test Comment' }] }],
          },
        },
      ],
      total: 1,
    });
    vi.spyOn(comments, 'listTicketComments').mockResolvedValue({
      items: [
        {
          commentId: '01KRP3QWS4BSHT6G45GJ2A4K04',
          ticketId: 'jira_SCRUM-6',
          body: 'Test Comment',
          commentSource: 'usd_comment',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
    });
    const del = vi.spyOn(comments, 'deleteTicketComment').mockResolvedValue();
    vi.spyOn(comments, 'upsertTicketComment').mockResolvedValue({
      commentId: buildJiraSyncedCommentId('10000'),
      ticketId: 'jira_SCRUM-6',
      body: 'Test Comment',
      commentSource: 'jira_comment',
      createdAt: 't',
    });
    await syncIssueComments({
      orgId: 'o',
      ticketId: 'jira_SCRUM-6',
      issueKey: 'SCRUM-6',
    });
    expect(del).toHaveBeenCalledWith('o', 'jira_SCRUM-6#01KRP3QWS4BSHT6G45GJ2A4K04');
  });
});
