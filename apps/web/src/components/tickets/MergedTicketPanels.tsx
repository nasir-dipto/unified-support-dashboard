import type { TicketApiDto } from '@usd/shared-types';
import { Badge, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import type { JiraHdPair } from '../../utils/merged-incident.js';
import {
  formatAssignee,
  formatCustomer,
  formatStatusLabel,
  statusColor,
  ticketExternalUrl,
} from '../../utils/ticket-display';

export type MergedTicketPanelsProps = {
  pair: JiraHdPair;
};

/**
 * Side-by-side Jira and Helpdesk context panels for a merged incident.
 */
export function MergedTicketPanels(props: MergedTicketPanelsProps): ReactElement {
  const { pair } = props;
  const { jira, hd } = pair;

  return (
    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Panel
        title="Jira"
        accent={usdColors.blue}
        ticket={jira}
        rows={[
          ['Status', formatStatusLabel(jira.status)],
          ['Priority', jira.priority],
          ['Assignee', formatAssignee(jira.assigneeId)],
        ]}
      />
      <Panel
        title="ManageEngine"
        accent={usdColors.purple}
        ticket={hd}
        rows={[
          ['Status', formatStatusLabel(hd.status)],
          ['Requester', formatCustomer(hd)],
          ['Assignee', formatAssignee(hd.assigneeId)],
        ]}
      />
    </div>
  );
}

type PanelProps = {
  title: string;
  accent: string;
  ticket: TicketApiDto;
  rows: [string, string][];
};

function Panel(props: PanelProps): ReactElement {
  const { title, accent, ticket, rows } = props;
  const externalUrl = ticketExternalUrl(ticket);

  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
      style={{ borderTopWidth: 3, borderTopColor: accent }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge label={title} color={accent} sm />
        {externalUrl !== undefined ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-bold"
            style={{ color: accent }}
          >
            Open
          </a>
        ) : null}
      </div>
      <p className="mb-2 text-[13px] font-semibold text-gray-900">{ticket.summary}</p>
      <dl className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2 text-xs">
            <dt className="font-bold uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className="font-semibold capitalize text-gray-800">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2">
        <Badge label={formatStatusLabel(ticket.status)} color={statusColor(ticket.status)} sm />
      </div>
    </div>
  );
}
