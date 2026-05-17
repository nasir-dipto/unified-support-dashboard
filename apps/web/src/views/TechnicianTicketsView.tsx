import type { TicketApiDto } from '@usd/shared-types';
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
import { useUsdWebSocket } from '../hooks/useWebSocket';
import { useTicketsList } from '../hooks/useTickets';
import { useAuthStore } from '../store/auth.store';

function filterTickets(
  tickets: TicketApiDto[],
  tab: TicketViewTab,
  priority: PriorityFilter,
  search: string,
  userId: string | undefined,
): TicketApiDto[] {
  let base = tickets;
  if (tab === 'mine' && userId !== undefined) {
    base = tickets.filter((t) => t.assigneeId === userId);
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
 * Technician ticket queue (TechView) with real API data.
 */
export function TechnicianTicketsView(): ReactElement {
  useUsdWebSocket();
  const userId = useAuthStore((s) => s.user?.userId);
  const { data, isLoading, error } = useTicketsList();
  const [tab, setTab] = useState<TicketViewTab>('all');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [commentTicket, setCommentTicket] = useState<TicketApiDto | null>(null);

  const tickets = data?.data ?? [];
  const counts = useMemo(
    () => ({
      all: tickets.length,
      mine: userId !== undefined ? tickets.filter((t) => t.assigneeId === userId).length : 0,
      jira: tickets.filter((t) => t.source === 'jira').length,
      me: tickets.filter((t) => t.source === 'helpdesk').length,
    }),
    [tickets, userId],
  );
  const rows = filterTickets(tickets, tab, priority, search, userId);

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
      <h1 className="text-[26px] font-extrabold text-gray-900">Ticket Queue</h1>
      <p className="mb-5 text-sm text-gray-500">Manage and resolve Jira and ManageEngine tickets.</p>

      <TicketStatsRow tickets={tickets} />

      <TicketFilters
        tab={tab}
        onTabChange={setTab}
        priority={priority}
        onPriorityChange={setPriority}
        search={search}
        onSearchChange={setSearch}
        counts={counts}
      />

      <div className="mb-3 flex items-center gap-2">
        <StatusDot color={usdColors.green} size={10} />
        <span className="text-sm font-bold text-gray-900">{tabLabel}</span>
        <span className="ml-auto text-sm text-gray-400">{rows.length} tickets</span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grid flex-1 grid-cols-1 gap-3.5 md:grid-cols-2">
          {rows.map((t) => (
            <TicketCard
              key={t.ticketId}
              ticket={t}
              onOpenDetail={() => { setDetailId(t.ticketId); }}
              onOpenComment={setCommentTicket}
            />
          ))}
          {rows.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-gray-400">No tickets match.</p>
          ) : null}
        </div>
        <div className="w-full shrink-0 lg:w-80">
          <ActivitySidebar />
        </div>
      </div>

      <DetailModal ticketId={detailId} open={detailId !== null} onClose={() => { setDetailId(null); }} />
      <CommentModal ticket={commentTicket} onClose={() => { setCommentTicket(null); }} />
    </>
  );
}
