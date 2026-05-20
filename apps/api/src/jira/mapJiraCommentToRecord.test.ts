import { describe, expect, it } from 'vitest';
import { mapJiraCommentToRecord } from './mapJiraCommentToRecord.js';

describe('mapJiraCommentToRecord', () => {
  it('maps Jira comment with ADF body to jira_comment record', () => {
    const rec = mapJiraCommentToRecord({
      orgId: 'demo-org',
      ticketId: 'jira_SCRUM-1',
      comment: {
        id: '10001',
        created: '2026-01-15T10:00:00.000Z',
        author: { displayName: 'Nasir', emailAddress: 'n@example.com' },
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Please check logs' }],
            },
          ],
        },
      },
    });
    expect(rec).not.toBeNull();
    expect(rec?.commentId).toBe('jira_10001');
    expect(rec?.commentSource).toBe('jira_comment');
    expect(rec?.body).toBe('Please check logs');
    expect(rec?.authorDisplayName).toBe('Nasir');
  });

  it('returns null when comment id missing', () => {
    expect(
      mapJiraCommentToRecord({
        orgId: 'o',
        ticketId: 'jira_X',
        comment: { body: 'x' },
      }),
    ).toBeNull();
  });
});
