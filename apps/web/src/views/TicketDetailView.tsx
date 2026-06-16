import type { ReactElement } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { TicketDetailContent } from '../components/tickets/TicketDetailContent';
import { useTicketDetail } from '../hooks/useTickets';

/**
 * Full-page ticket detail at `/tickets/:ticketId`.
 */
export function TicketDetailView(): ReactElement {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const detailQuery = useTicketDetail(ticketId);

  if (ticketId === undefined || ticketId.trim().length === 0) {
    return <Navigate to="/tickets" replace />;
  }

  const backControl = (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/tickets');
        }
      }}
      className="mb-4 text-sm font-semibold text-usd-indigo hover:underline"
    >
      ← Back to tickets
    </button>
  );

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl lg:max-w-6xl">
        {backControl}
        <p className="text-sm text-gray-500">Loading ticket…</p>
      </div>
    );
  }

  if (detailQuery.isError || detailQuery.data?.data === undefined) {
    return (
      <div className="mx-auto w-full max-w-5xl lg:max-w-6xl">
        {backControl}
        <p className="text-sm text-gray-600">Ticket not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-8 lg:max-w-6xl">
      {backControl}
      <TicketDetailContent ticketId={ticketId} />
    </div>
  );
}
