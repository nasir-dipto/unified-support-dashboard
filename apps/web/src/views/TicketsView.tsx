import type { ReactElement } from 'react';
import { useState } from 'react';
import { ActivitySidebar } from '../components/tickets/ActivitySidebar';
import { DetailModal } from '../components/tickets/DetailModal';
import { TicketCard } from '../components/tickets/TicketCard';
import { useUsdWebSocket } from '../hooks/useWebSocket';
import { useTicketsList } from '../hooks/useTickets';

/**
 * Ticket inbox: loads tickets via TanStack Query and renders `TicketCard` rows.
 */
export function TicketsView(): ReactElement {
  useUsdWebSocket();
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const { data, isLoading, error } = useTicketsList();

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading tickets…</p>;
  }
  if (error !== null) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Failed to load tickets.
      </p>
    );
  }
  if (data === undefined || data.data.length === 0) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row">
        <p className="flex-1 text-sm text-slate-600">No tickets yet.</p>
        <div className="w-full lg:w-80">
          <ActivitySidebar />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-3">
          {data.data.map((t) => (
            <TicketCard
              key={t.ticketId}
              ticket={t}
              onOpenDetail={() => {
                setDetailTicketId(t.ticketId);
              }}
            />
          ))}
        </div>
        <div className="w-full lg:w-80">
          <ActivitySidebar />
        </div>
      </div>
      <DetailModal
        ticketId={detailTicketId}
        open={detailTicketId !== null}
        onClose={() => {
          setDetailTicketId(null);
        }}
      />
    </>
  );
}
