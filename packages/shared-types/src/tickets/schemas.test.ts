import { describe, expect, it } from 'vitest';
import {
  commentSourceSchema,
  postTicketCommentBodySchema,
  supportTicketCommentRecordSchema,
  ticketCommentApiDtoSchema,
  ticketsListQuerySchema,
  ticketsListResponseSchema,
} from './schemas.js';

describe('tickets list schemas', () => {
  it('defaults page and limit on query', () => {
    const q = ticketsListQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.limit).toBe(10);
    expect(q.sort).toBe('newest');
  });

  it('parses list response with pagination and facets', () => {
    const body = ticketsListResponseSchema.parse({
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
      facets: {
        projects: {},
        sources: { jira: 0, helpdesk: 0 },
        priorities: { critical: 0, high: 0, medium: 0, low: 0 },
        statuses: { open: 0, in_progress: 0, resolved: 0, closed: 0, pending: 0 },
        mineCount: 0,
        viewCounts: { all: 0, mine: 0, jira: 0, me: 0 },
      },
    });
    expect(body.pagination.page).toBe(1);
    expect(body.facets.viewCounts.all).toBe(0);
  });
});

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
