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
import { useTicketsList } from '../hooks/useTickets';
import { useAuthStore } from '../store/auth.store';
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
 * Bell icon for the activity panel toggle.
 */
function BellIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * Technician ticket queue (TechView) with server-side filters, facets, and URL state.
 */
export function TechnicianTicketsView(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const { params, setParams } = useTicketQueueParams();
  const [searchInput, setSearchInput] = useState(params.q);
  const debouncedQ = useDebouncedValue(searchInput, 300);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [commentTicket, setCommentTicket] = useState<TicketApiDto | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

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

  return (
    <>
      <h1 className="text-[22px] font-extrabold text-gray-900">Ticket Queue</h1>
      <p className="mb-3 text-xs text-gray-500">Manage and resolve Jira and ManageEngine tickets.</p>

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
          onClick={() => { setActivityOpen((open) => !open); }}
          className={`ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold transition-colors ${
            activityOpen
              ? 'border-usd-indigo bg-usd-indigo text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
          aria-expanded={activityOpen}
          aria-controls="activity-panel"
        >
          <BellIcon />
          Activity
        </button>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {isFetching ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60"
            aria-hidden
          >
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-usd-indigo" />
          </div>
        ) : null}
        {tickets.map((t) => {
          const canWrite =
            user !== null &&
            canWriteTicket(user.roles, t, user.email, user.displayName);
          return (
            <TicketCard
              key={t.ticketId}
              ticket={t}
              onOpenDetail={() => { setDetailId(t.ticketId); }}
              onOpenComment={canWrite ? setCommentTicket : undefined}
            />
          );
        })}
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
