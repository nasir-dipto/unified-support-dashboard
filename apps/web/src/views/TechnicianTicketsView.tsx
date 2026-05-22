import type { AuthUserPublic, TicketApiDto } from '@usd/shared-types';
import { StatusDot, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { ActivitySidebar } from '../components/tickets/ActivitySidebar';
import { CommentModal } from '../components/tickets/CommentModal';
import { DetailModal } from '../components/tickets/DetailModal';
import { TicketCard } from '../components/tickets/TicketCard';
import {
  TicketFilters,
  type PriorityFilter,
  type TicketViewTab,
} from '../components/tickets/TicketFilters';
import { TicketStatsRow } from '../components/tickets/TicketStatsRow';
import { DEFAULT_TICKETS_LIST_LIMIT, useTicketsList } from '../hooks/useTickets';
import { useAuthStore } from '../store/auth.store';
import { canWriteTicket } from '../utils/permissions';
import { isTechnicianOnly } from '../utils/roles';
import { isTicketAssignedToCurrentUser } from '../utils/ticket-display';

/**
 * Default ticket list tab: technicians start on My Tickets; others on All.
 */
export function getDefaultTicketViewTab(
  user: AuthUserPublic | null | undefined,
): TicketViewTab {
  if (user !== null && user !== undefined && isTechnicianOnly(user.roles)) {
    return 'mine';
  }
  return 'all';
}

function filterTickets(
  tickets: TicketApiDto[],
  tab: TicketViewTab,
  priority: PriorityFilter,
  search: string,
  user: AuthUserPublic | null | undefined,
): TicketApiDto[] {
  let base = tickets;
  if (tab === 'mine') {
    base = tickets.filter((t) => isTicketAssignedToCurrentUser(t, user));
  } else if (tab === 'jira') {
    base = tickets.filter((t) => t.source === 'jira');
  } else if (tab === 'me') {
    base = tickets.filter((t) => t.source === 'helpdesk');
  }
  const q = search.trim().toLowerCase();
  return base.filter(
    (t) =>
      (priority === 'all' || t.priority === priority) &&
      (q.length === 0 ||
        t.summary.toLowerCase().includes(q) ||
        t.externalId.toLowerCase().includes(q) ||
        t.ticketId.toLowerCase().includes(q)),
  );
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
 * Technician ticket queue (TechView) with real API data.
 */
export function TechnicianTicketsView(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useTicketsList({ limit: DEFAULT_TICKETS_LIST_LIMIT });
  const [tab, setTab] = useState<TicketViewTab>(() => getDefaultTicketViewTab(user));
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [commentTicket, setCommentTicket] = useState<TicketApiDto | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  const tickets = data?.data ?? [];
  const technicianOnly = user !== null && isTechnicianOnly(user.roles);
  const counts = useMemo(
    () => ({
      all: tickets.length,
      mine: tickets.filter((t) => isTicketAssignedToCurrentUser(t, user)).length,
      jira: tickets.filter((t) => t.source === 'jira').length,
      me: tickets.filter((t) => t.source === 'helpdesk').length,
    }),
    [tickets, user],
  );
  const rows = filterTickets(tickets, tab, priority, search, user);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-gray-200 border-t-usd-indigo" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Loading tickets…</p>
      </div>
    );
  }

  if (error !== null) {
    return (
      <p className="text-sm text-usd-red" role="alert">
        Failed to load tickets.
      </p>
    );
  }

  const tabLabel =
    tab === 'mine' ? 'My tickets' : tab === 'jira' ? 'Jira' : tab === 'me' ? 'ManageEngine' : 'All tickets';

  return (
    <>
      <h1 className="text-[22px] font-extrabold text-gray-900">Ticket Queue</h1>
      <p className="mb-3 text-xs text-gray-500">Manage and resolve Jira and ManageEngine tickets.</p>

      <TicketStatsRow tickets={tickets} technicianOnly={technicianOnly} />

      <TicketFilters
        tab={tab}
        onTabChange={setTab}
        priority={priority}
        onPriorityChange={setPriority}
        search={search}
        onSearchChange={setSearch}
        counts={counts}
      />

      <div className="mb-2 flex items-center gap-2">
        <StatusDot color={usdColors.green} size={8} />
        <span className="text-sm font-bold text-gray-900">{tabLabel}</span>
        <span className="text-xs text-gray-400">{rows.length} tickets</span>
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {rows.map((t) => {
          const canWrite =
            user !== null &&
            canWriteTicket(user.roles, t, user.email, user.displayName);
          const showReadOnlyBanner =
            technicianOnly && tab === 'all' && !canWrite;
          return (
            <TicketCard
              key={t.ticketId}
              ticket={t}
              readOnly={showReadOnlyBanner}
              onOpenDetail={() => { setDetailId(t.ticketId); }}
              onOpenComment={canWrite ? setCommentTicket : undefined}
            />
          );
        })}
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No tickets match.</p>
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
