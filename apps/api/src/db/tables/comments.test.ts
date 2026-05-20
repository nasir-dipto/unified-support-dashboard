import { describe, expect, it } from 'vitest';
import { buildTicketCommentSortKey, sortCommentsAscending } from './comments.js';

describe('comments table helpers', () => {
  it('buildTicketCommentSortKey prefixes ticket id for begins_with queries', () => {
    expect(buildTicketCommentSortKey('jira_ABC-1', '01JCOMMENT')).toBe('jira_ABC-1#01JCOMMENT');
  });

  it('sortCommentsAscending orders by createdAt', () => {
    const sorted = sortCommentsAscending([
      {
        commentId: 'b',
        ticketId: 't',
        body: '2',
        commentSource: 'jira_comment',
        createdAt: '2026-02-02T00:00:00Z',
      },
      {
        commentId: 'a',
        ticketId: 't',
        body: '1',
        commentSource: 'usd_comment',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    expect(sorted[0]?.commentId).toBe('a');
    expect(sorted[1]?.commentId).toBe('b');
  });
});
