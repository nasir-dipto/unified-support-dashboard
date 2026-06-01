import type { TicketListSort, TicketsListQuery } from '@usd/shared-types';
import type { PriorityFilter, TicketViewTab } from '../components/tickets/TicketFilters';

export type TicketQueueParams = {
  page: number;
  limit: number;
  tab: TicketViewTab;
  priority: PriorityFilter;
  project: string;
  q: string;
  sort: TicketListSort;
};

const DEFAULT_LIMIT = 10;

/**
 * Parses ticket queue state from URL search params.
 */
export function parseTicketQueueParams(searchParams: URLSearchParams): TicketQueueParams {
  const pageRaw = Number(searchParams.get('page') ?? '1');
  const limitRaw = Number(searchParams.get('limit') ?? String(DEFAULT_LIMIT));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const limit =
    Number.isFinite(limitRaw) && limitRaw >= 1 && limitRaw <= 100
      ? Math.floor(limitRaw)
      : DEFAULT_LIMIT;

  const tabRaw = searchParams.get('tab');
  const tab: TicketViewTab =
    tabRaw === 'mine' || tabRaw === 'jira' || tabRaw === 'me' || tabRaw === 'all' ? tabRaw : 'all';

  const priorityRaw = searchParams.get('priority');
  const priority: PriorityFilter =
    priorityRaw === 'critical' ||
    priorityRaw === 'high' ||
    priorityRaw === 'medium' ||
    priorityRaw === 'low' ||
    priorityRaw === 'all'
      ? priorityRaw
      : 'all';

  const sortRaw = searchParams.get('sort');
  const sort: TicketListSort =
    sortRaw === 'oldest' || sortRaw === 'priority' || sortRaw === 'status' || sortRaw === 'newest'
      ? sortRaw
      : 'newest';

  return {
    page,
    limit,
    tab,
    priority,
    project: searchParams.get('project') ?? '',
    q: searchParams.get('q') ?? '',
    sort,
  };
}

/**
 * Maps UI queue params to GET /api/tickets query object.
 */
export function ticketQueueParamsToApiQuery(
  params: TicketQueueParams,
): TicketsListQuery {
  const query: TicketsListQuery = {
    page: params.page,
    limit: params.limit,
    sort: params.sort,
  };
  if (params.tab === 'mine') {
    query.mine = true;
  } else if (params.tab === 'jira') {
    query.source = 'jira';
  } else if (params.tab === 'me') {
    query.source = 'helpdesk';
  }
  if (params.priority !== 'all') {
    query.priority = params.priority;
  }
  if (params.project.length > 0) {
    query.project = params.project;
  }
  if (params.q.trim().length > 0) {
    query.q = params.q.trim();
  }
  return query;
}

/**
 * Serializes queue params into URL search params (omits defaults where sensible).
 */
export function ticketQueueParamsToSearchParams(params: TicketQueueParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.page > 1) {
    sp.set('page', String(params.page));
  }
  if (params.limit !== DEFAULT_LIMIT) {
    sp.set('limit', String(params.limit));
  }
  if (params.tab !== 'all') {
    sp.set('tab', params.tab);
  }
  if (params.priority !== 'all') {
    sp.set('priority', params.priority);
  }
  if (params.project.length > 0) {
    sp.set('project', params.project);
  }
  if (params.q.length > 0) {
    sp.set('q', params.q);
  }
  if (params.sort !== 'newest') {
    sp.set('sort', params.sort);
  }
  return sp;
}

/**
 * Merges partial updates into queue params (resets page unless page is set).
 */
export function mergeTicketQueueParams(
  current: TicketQueueParams,
  patch: Partial<TicketQueueParams>,
): TicketQueueParams {
  const next = { ...current, ...patch };
  if (patch.page === undefined && Object.keys(patch).some((k) => k !== 'page')) {
    next.page = 1;
  }
  return next;
}
