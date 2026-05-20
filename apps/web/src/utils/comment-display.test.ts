import { describe, expect, it } from 'vitest';
import { commentSourceLabel, sortThreadComments } from './comment-display.js';

describe('comment-display', () => {
  it('commentSourceLabel maps all sources', () => {
    expect(commentSourceLabel('jira_comment')).toBe('Jira comment');
    expect(commentSourceLabel('hd_note')).toBe('Internal note');
    expect(commentSourceLabel('hd_email')).toBe('Customer email');
    expect(commentSourceLabel('usd_comment')).toBe('USD comment');
  });

  it('sortThreadComments orders ascending by createdAt', () => {
    const sorted = sortThreadComments([
      {
        commentId: 'b',
        ticketId: 't',
        body: '2',
        commentSource: 'hd_note',
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
  });
});
