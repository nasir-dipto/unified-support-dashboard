import type { TicketApiDto } from '@usd/shared-types';
import type { ReactElement } from 'react';

const priorityClass: Record<TicketApiDto['priority'], string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-slate-500 text-white',
};

const statusClass: Record<TicketApiDto['status'], string> = {
  open: 'border border-blue-300 bg-blue-50 text-blue-900',
  in_progress: 'border border-amber-300 bg-amber-50 text-amber-900',
  pending: 'border border-zinc-300 bg-zinc-200 text-zinc-900',
  resolved: 'border border-emerald-300 bg-emerald-50 text-emerald-900',
  closed: 'border border-slate-300 bg-slate-100 text-slate-800',
};

export type TicketCardProps = {
  ticket: TicketApiDto;
};

/**
 * Ticket summary row with source badge (Jira blue, Helpdesk purple), priority, status, id, and summary.
 */
export function TicketCard(props: TicketCardProps): ReactElement {
  const { ticket } = props;
  const sourceLabel = ticket.source === 'jira' ? 'Jira' : 'Helpdesk';
  const sourceStyle =
    ticket.source === 'jira'
      ? 'bg-blue-600 text-white'
      : 'bg-purple-600 text-white';

  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="ticket-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${sourceStyle}`}
          data-testid="ticket-source"
        >
          {sourceLabel}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${priorityClass[ticket.priority]}`}
          data-testid="ticket-priority"
        >
          {ticket.priority}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass[ticket.status]}`}
          data-testid="ticket-status"
        >
          {ticket.status}
        </span>
        <span
          className="font-mono text-xs text-slate-600"
          data-testid="ticket-id"
        >{`${ticket.externalId} · ${ticket.ticketId}`}</span>
      </div>
      <h2 className="mt-2 text-sm font-medium text-slate-900" data-testid="ticket-summary">
        {ticket.summary}
      </h2>
    </article>
  );
}
