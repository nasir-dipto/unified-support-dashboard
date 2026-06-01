import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TICKET_BUCKET,
  mergeTicketQueueParams,
  parseTicketQueueParams,
  ticketQueueParamsToApiQuery,
  ticketQueueParamsToSearchParams,
} from './ticket-queue-params';

describe('parseTicketQueueParams', () => {
  it('defaults page, limit, sort, and bucket open', () => {
    const p = parseTicketQueueParams(new URLSearchParams());
    expect(p.page).toBe(1);
    expect(p.limit).toBe(10);
    expect(p.sort).toBe('newest');
    expect(p.tab).toBe('all');
    expect(p.bucket).toBe(DEFAULT_TICKET_BUCKET);
  });

  it('parses bucket from URL', () => {
    expect(parseTicketQueueParams(new URLSearchParams('bucket=closed')).bucket).toBe('closed');
    expect(parseTicketQueueParams(new URLSearchParams('bucket=all')).bucket).toBe('all');
  });

  it('parses filters from URL', () => {
    const p = parseTicketQueueParams(
      new URLSearchParams('tab=jira&priority=high&project=TILMS&q=bug&sort=priority&page=2'),
    );
    expect(p.tab).toBe('jira');
    expect(p.priority).toBe('high');
    expect(p.project).toBe('TILMS');
    expect(p.q).toBe('bug');
    expect(p.sort).toBe('priority');
    expect(p.page).toBe(2);
  });
});

describe('ticketQueueParamsToApiQuery', () => {
  it('maps open bucket to API query', () => {
    const q = ticketQueueParamsToApiQuery({
      page: 1,
      limit: 10,
      tab: 'all',
      bucket: 'open',
      priority: 'all',
      project: '',
      q: '',
      sort: 'newest',
    });
    expect(q.bucket).toBe('open');
  });

  it('omits bucket=all from API query', () => {
    const q = ticketQueueParamsToApiQuery({
      page: 1,
      limit: 10,
      tab: 'all',
      bucket: 'all',
      priority: 'all',
      project: '',
      q: '',
      sort: 'newest',
    });
    expect(q.bucket).toBeUndefined();
  });
});

describe('mergeTicketQueueParams', () => {
  it('resets page when filter changes', () => {
    const base = parseTicketQueueParams(new URLSearchParams('page=3'));
    const next = mergeTicketQueueParams(base, { bucket: 'closed' });
    expect(next.page).toBe(1);
    expect(next.bucket).toBe('closed');
  });
});

describe('ticketQueueParamsToSearchParams', () => {
  it('omits open default bucket from URL', () => {
    const sp = ticketQueueParamsToSearchParams({
      page: 1,
      limit: 10,
      tab: 'all',
      bucket: 'open',
      priority: 'all',
      project: '',
      q: '',
      sort: 'newest',
    });
    expect(sp.get('bucket')).toBeNull();
  });

  it('includes closed and all bucket in URL', () => {
    const closed = ticketQueueParamsToSearchParams({
      page: 1,
      limit: 10,
      tab: 'all',
      bucket: 'closed',
      priority: 'all',
      project: '',
      q: '',
      sort: 'newest',
    });
    expect(closed.get('bucket')).toBe('closed');

    const all = ticketQueueParamsToSearchParams({
      page: 1,
      limit: 10,
      tab: 'all',
      bucket: 'all',
      priority: 'all',
      project: '',
      q: '',
      sort: 'newest',
    });
    expect(all.get('bucket')).toBe('all');
  });
});
