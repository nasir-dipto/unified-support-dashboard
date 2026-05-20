import { describe, expect, it } from 'vitest';
import {
  commentSourceSchema,
  postTicketCommentBodySchema,
  supportTicketCommentRecordSchema,
  ticketCommentApiDtoSchema,
} from './schemas.js';

describe('ticket comment schemas', () => {
  it('parses commentSource enum', () => {
    expect(commentSourceSchema.parse('jira_comment')).toBe('jira_comment');
    expect(commentSourceSchema.parse('hd_email')).toBe('hd_email');
  });

  it('parses stored comment with commentSource', () => {
    const row = supportTicketCommentRecordSchema.parse({
      orgId: 'o',
      ticketCommentKey: 't#c',
      ticketId: 't',
      commentId: 'c',
      body: 'text',
      commentSource: 'usd_comment',
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(ticketCommentApiDtoSchema.parse(row).commentSource).toBe('usd_comment');
  });

  it('parses post body with optional replyKind', () => {
    expect(postTicketCommentBodySchema.parse({ body: 'hi' }).replyKind).toBeUndefined();
    expect(postTicketCommentBodySchema.parse({ body: 'hi', replyKind: 'hd_email' }).replyKind).toBe(
      'hd_email',
    );
  });
});
