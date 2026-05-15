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
  /** Opens ticket detail inspector when provided (keyboard-accessible card). */
  onOpenDetail?: (ticket: TicketApiDto) => void;
};

/**
 * Ticket summary row with source badge (Jira blue, Helpdesk purple), priority, status, id, and summary.
 */
export function TicketCard(props: TicketCardProps): ReactElement {
  const { ticket, onOpenDetail } = props;
  const sourceLabel = ticket.source === 'jira' ? 'Jira' : 'Helpdesk';
  const sourceStyle =
    ticket.source === 'jira'
      ? 'bg-blue-600 text-white'
      : 'bg-purple-600 text-white';

  return (
    <article
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
        onOpenDetail !== undefined ? 'cursor-pointer hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400' : ''
      }`}
      data-testid="ticket-card"
      role={onOpenDetail !== undefined ? 'button' : undefined}
      tabIndex={onOpenDetail !== undefined ? 0 : undefined}
      onClick={() => {
        onOpenDetail?.(ticket);
      }}
      onKeyDown={(e) => {
        if (onOpenDetail === undefined) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(ticket);
        }
      }}
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
