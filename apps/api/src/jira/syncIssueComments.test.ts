import { afterEach, describe, expect, it, vi } from 'vitest';
import * as comments from '../db/tables/comments.js';
import * as jiraService from '../services/jira.service.js';
import { syncIssueComments } from './syncIssueComments.js';

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
});
