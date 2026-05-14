import type { ReactElement } from 'react';
import { TicketCard } from '../components/tickets/TicketCard';
import { useTicketsList } from '../hooks/useTickets';

/**
 * Ticket inbox: loads tickets via TanStack Query and renders `TicketCard` rows.
 */
export function TicketsView(): ReactElement {
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
    return <p className="text-sm text-slate-600">No tickets yet.</p>;
  }

  return (
    <div className="space-y-3">
      {data.data.map((t) => (
        <TicketCard key={t.ticketId} ticket={t} />
      ))}
    </div>
  );
}
