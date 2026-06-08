import type { AuthUserPublic, TicketApiDto } from '@usd/shared-types';
import { StatusDot, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { ActivitySidebar } from '../components/tickets/ActivitySidebar';
import { CommentModal } from '../components/tickets/CommentModal';
import { DetailModal } from '../components/tickets/DetailModal';
import { TicketCard } from '../components/tickets/TicketCard';
import { TicketFilters } from '../components/tickets/TicketFilters';
import { TicketPagination } from '../components/tickets/TicketPagination';
import { TicketStatsRow } from '../components/tickets/TicketStatsRow';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useTicketQueueParams } from '../hooks/useTicketQueueParams';
import { useViewMode } from '../hooks/useViewMode';
import { useTicketsList } from '../hooks/useTickets';
import { useAuthStore } from '../store/auth.store';
import { filterUrgentWsEvents, useNotificationsStore } from '../store/notifications.store';
import { canWriteTicket } from '../utils/permissions';
import { isTechnicianOnly } from '../utils/roles';
import { ticketQueueParamsToApiQuery } from '../utils/ticket-queue-params';

/**
 * Default ticket list tab: technicians start on My Tickets; others on All.
 */
export function getDefaultTicketViewTab(
  user: AuthUserPublic | null | undefined,
): 'all' | 'mine' | 'jira' | 'me' {
  if (user !== null && user !== undefined && isTechnicianOnly(user.roles)) {
    return 'mine';
  }
  return 'all';
}

/**
 * Technician ticket queue (TechView) with server-side filters, facets, and URL state.
 */
export function TechnicianTicketsView(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const { params, setParams } = useTicketQueueParams();
  const { viewMode, setViewMode } = useViewMode();
  const [searchInput, setSearchInput] = useState(params.q);
  const debouncedQ = useDebouncedValue(searchInput, 300);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [commentTicket, setCommentTicket] = useState<TicketApiDto | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const activityEvents = useNotificationsStore((s) => s.events);
  const urgentCount = filterUrgentWsEvents(activityEvents).length;

  useEffect(() => {
    setSearchInput(params.q);
  }, [params.q]);

  useEffect(() => {
    if (debouncedQ !== params.q) {
      setParams({ q: debouncedQ });
    }
  }, [debouncedQ, params.q, setParams]);

  useEffect(() => {
    if (user == null) {
      return;
    }
    const sp = new URLSearchParams(window.location.search);
    if (!sp.has('tab') && isTechnicianOnly(user.roles)) {
      setParams({ tab: getDefaultTicketViewTab(user) });
    }
  }, [user, setParams]);

  const apiQuery = ticketQueueParamsToApiQuery({ ...params, q: debouncedQ });
  const { data, isLoading, isFetching, error } = useTicketsList(apiQuery);

  const tickets = data?.data ?? [];
  const pagination = data?.pagination;
  const facets = data?.facets;
  const technicianOnly = user !== null && isTechnicianOnly(user.roles);

  const counts = facets?.viewCounts ?? { all: 0, mine: 0, jira: 0, me: 0 };
  const bucketCounts = facets?.bucketCounts ?? { all: 0, open: 0, closed: 0 };
  const projectCounts = facets?.projects ?? {};

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-gray-200 border-t-usd-indigo" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Loading tickets…</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-usd-red" role="alert">
        Failed to load tickets.
      </p>
    );
  }

  const tabLabel =
    params.tab === 'mine'
      ? 'My tickets'
      : params.tab === 'jira'
        ? 'Jira'
        : params.tab === 'me'
          ? 'ManageEngine'
          : 'All tickets';

  const recentUpdatesLabel =
    urgentCount > 0 ? `Recent updates (${String(urgentCount)})` : 'Recent updates';

  return (
    <>
      <h1 className="text-[22px] font-extrabold text-gray-900">Ticket Queue</h1>
      <p className="mb-3 text-xs text-gray-500">Manage and resolve Jira and ManageEngine tickets.</p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="hidden w-[300px] shrink-0 lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)]">
          <ActivitySidebar sidebar />
        </div>

        <div className="min-w-0 flex-1">
          <TicketStatsRow
            facets={facets}
            total={pagination?.total ?? 0}
            technicianOnly={technicianOnly}
          />

          <TicketFilters
            tab={params.tab}
            onTabChange={(tab) => { setParams({ tab }); }}
            bucket={params.bucket}
            onBucketChange={(bucket) => { setParams({ bucket }); }}
            priority={params.priority}
            onPriorityChange={(priority) => { setParams({ priority }); }}
            search={searchInput}
            onSearchChange={setSearchInput}
            project={params.project}
            onProjectChange={(project) => { setParams({ project }); }}
            sort={params.sort}
            onSortChange={(sort) => { setParams({ sort }); }}
            counts={counts}
            bucketCounts={bucketCounts}
            projectCounts={projectCounts}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          <div className="mb-2 flex items-center gap-2">
            <StatusDot color={usdColors.green} size={8} />
            <span className="text-sm font-bold text-gray-900">{tabLabel}</span>
            <span className="text-xs text-gray-400">
              {pagination?.total ?? 0} tickets
              {isFetching ? ' · Updating…' : ''}
            </span>
            <button
              type="button"
              onClick={() => { setActivityOpen(true); }}
              className={`ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold transition-colors lg:hidden ${
                activityOpen
                  ? 'border-usd-indigo bg-usd-indigo text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
              aria-expanded={activityOpen}
              aria-controls="activity-panel"
            >
              {recentUpdatesLabel}
            </button>
          </div>

          <div
            className={`relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${
              viewMode === 'grid' ? 'p-3' : ''
            }`}
          >
            {isFetching ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60"
                aria-hidden
              >
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-usd-indigo" />
              </div>
            ) : null}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
                  : undefined
              }
            >
              {tickets.map((t) => {
                const canWrite =
                  user !== null &&
                  canWriteTicket(user.roles, t, user.email, user.displayName);
                return (
                  <TicketCard
                    key={t.ticketId}
                    ticket={t}
                    layout={viewMode}
                    onOpenDetail={() => { setDetailId(t.ticketId); }}
                    onOpenComment={canWrite ? setCommentTicket : undefined}
                  />
                );
              })}
            </div>
            {tickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No tickets match.</p>
            ) : null}
            {pagination !== undefined ? (
              <TicketPagination
                pagination={pagination}
                onPageChange={(page) => { setParams({ page }); }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <ActivitySidebar
        panel
        open={activityOpen}
        onClose={() => { setActivityOpen(false); }}
      />

      <DetailModal ticketId={detailId} open={detailId !== null} onClose={() => { setDetailId(null); }} />
      <CommentModal ticket={commentTicket} onClose={() => { setCommentTicket(null); }} />
    </>
  );
}
