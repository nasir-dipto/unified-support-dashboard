import { describe, expect, it } from 'vitest';
import { buildTicketCommentSortKey } from './comments.js';

describe('buildTicketCommentSortKey', () => {
  it('prefixes ticket id for begins_with queries', () => {
    expect(buildTicketCommentSortKey('jira_ABC-1', '01JCOMMENT')).toBe('jira_ABC-1#01JCOMMENT');
  });
});
