import { describe, expect, it } from 'vitest';
import {
  mergeTicketQueueParams,
  parseTicketQueueParams,
  ticketQueueParamsToApiQuery,
  ticketQueueParamsToSearchParams,
} from './ticket-queue-params';

describe('parseTicketQueueParams', () => {
  it('defaults page, limit, sort', () => {
    const p = parseTicketQueueParams(new URLSearchParams());
    expect(p.page).toBe(1);
    expect(p.limit).toBe(10);
    expect(p.sort).toBe('newest');
    expect(p.tab).toBe('all');
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
  it('maps tab mine to mine=true', () => {
    const q = ticketQueueParamsToApiQuery({
      page: 1,
      limit: 10,
      tab: 'mine',
      priority: 'all',
      project: '',
      q: '',
      sort: 'newest',
    });
    expect(q.mine).toBe(true);
    expect(q.source).toBeUndefined();
  });

  it('maps jira tab to source=jira', () => {
    const q = ticketQueueParamsToApiQuery({
      page: 1,
      limit: 10,
      tab: 'jira',
      priority: 'all',
      project: '',
      q: '',
      sort: 'newest',
    });
    expect(q.source).toBe('jira');
  });
});

describe('mergeTicketQueueParams', () => {
  it('resets page when filter changes', () => {
    const base = parseTicketQueueParams(new URLSearchParams('page=3'));
    const next = mergeTicketQueueParams(base, { priority: 'critical' });
    expect(next.page).toBe(1);
    expect(next.priority).toBe('critical');
  });
});

describe('ticketQueueParamsToSearchParams', () => {
  it('omits default values', () => {
    const sp = ticketQueueParamsToSearchParams({
      page: 1,
      limit: 10,
      tab: 'all',
      priority: 'all',
      project: '',
      q: '',
      sort: 'newest',
    });
    expect(sp.toString()).toBe('');
  });
});
