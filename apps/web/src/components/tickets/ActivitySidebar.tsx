import type { WsOutboundEnvelope } from '@usd/shared-types';
import { Badge, Pill, StatusDot, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationsStore } from '../../store/notifications.store';
import {
  countActionRequired,
  filterActivityEventsBySource,
  formatActivityTicketDisplayId,
  formatTimeAgo,
  getActivityEventAttribution,
  getActivityEventSource,
  getActivityEventSummary,
  getActivityEventTimestamp,
  isActionRequired,
  parseActivityTicketSnapshot,
  type ActivitySourceFilter,
} from '../../utils/activity-feed';
import { formatStatusLabel } from '../../utils/ticket-display';
import { isTechnicianOnly } from '../../utils/roles';

export type ActivitySidebarProps = {
  /** When set, renders as a slide-out overlay (use with `open` / `onClose`) */
  panel?: boolean;
  /** Fixed left-column layout (full-height scroll, lg+ queue sidebar) */
  sidebar?: boolean;
  open?: boolean;
  onClose?: () => void;
};

/**
 * Renders one rich activity feed entry.
 */
function ActivityFeedEntry(props: { event: WsOutboundEnvelope }): ReactElement {
  const { event } = props;
  const navigate = useNavigate();
  const ticket = parseActivityTicketSnapshot(event);
  const source = getActivityEventSource(event);
  const sourceLabel = source === 'jira' ? 'Jira' : source === 'helpdesk' ? 'ME' : null;
  const sourceColor = source === 'jira' ? usdColors.blue : usdColors.purple;
  const displayId = formatActivityTicketDisplayId(event, ticket);
  const timestamp = getActivityEventTimestamp(event);
  const timeAgo = timestamp !== undefined ? formatTimeAgo(timestamp) : '';
  const summary = getActivityEventSummary(event);
  const attribution = getActivityEventAttribution(event);
  const actionRequired = isActionRequired(event);
  const status = ticket?.status;

  return (
    <li>
      <button
        type="button"
        onClick={() => { navigate(`/tickets/${event.ticketId}`); }}
        className={`w-full rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors hover:cursor-pointer hover:bg-gray-50 ${
          actionRequired ? 'border-red-200 bg-red-50/40' : 'border-gray-100'
        }`}
      >
      <div className="mb-1 flex flex-wrap items-center gap-1">
        {sourceLabel !== null ? <Badge label={sourceLabel} color={sourceColor} sm /> : null}
        <span className="font-mono text-[10px] font-bold text-gray-600">{displayId}</span>
        {timeAgo.length > 0 ? (
          <span className="text-[10px] text-gray-400">{timeAgo}</span>
        ) : null}
        {actionRequired ? (
          <span className="rounded bg-usd-red px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Action required
          </span>
        ) : null}
      </div>
      <p className="font-medium leading-snug text-gray-900">{summary}</p>
      {status !== undefined ? (
        <p className="mt-0.5 text-[10px] text-gray-500">
          Status: <span className="capitalize">{formatStatusLabel(status)}</span>
        </p>
      ) : null}
      {attribution !== null ? (
        <p className="mt-0.5 text-[10px] text-gray-500">{attribution}</p>
      ) : null}
      </button>
    </li>
  );
}

type ActivityFeedBodyProps = {
  events: WsOutboundEnvelope[];
  technicianScoped: boolean;
  onClose?: () => void;
  panel?: boolean;
};

/**
 * Shared feed header, filters, and entry list for sidebar and panel modes.
 */
function ActivityFeedBody(props: ActivityFeedBodyProps): ReactElement {
  const { events, technicianScoped, onClose, panel = false } = props;
  const [sourceFilter, setSourceFilter] = useState<ActivitySourceFilter>('all');

  const filteredEvents = useMemo(
    () => filterActivityEventsBySource(events, sourceFilter),
    [events, sourceFilter],
  );
  const urgentCount = useMemo(() => countActionRequired(events), [events]);

  const subtitle = technicianScoped
    ? 'Updates on your tickets'
    : 'Recent updates across tickets';
  const emptyMessage = technicianScoped
    ? 'No recent updates on your tickets'
    : 'No recent updates';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusDot color={usdColors.teal} size={8} />
          <h2 className="text-sm font-bold text-gray-900">Recent updates</h2>
          {urgentCount > 0 ? (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-usd-red">
              {String(urgentCount)} urgent
            </span>
          ) : null}
        </div>
        {panel && onClose !== undefined ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-0.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100"
            aria-label="Close activity panel"
          >
            Close
          </button>
        ) : null}
      </div>
      <p className="shrink-0 border-b border-gray-100 px-3 py-1.5 text-[11px] text-gray-500">{subtitle}</p>

      <div className="flex shrink-0 flex-wrap gap-1 border-b border-gray-100 px-3 py-2">
        <Pill
          compact
          label="All"
          active={sourceFilter === 'all'}
          onClick={() => { setSourceFilter('all'); }}
        />
        <Pill
          compact
          label="Jira"
          active={sourceFilter === 'jira'}
          onClick={() => { setSourceFilter('jira'); }}
        />
        <Pill
          compact
          label="ME"
          active={sourceFilter === 'me'}
          onClick={() => { setSourceFilter('me'); }}
        />
      </div>

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {filteredEvents.map((event, idx) => (
          <ActivityFeedEntry key={`${event.type}-${event.ticketId}-${String(idx)}`} event={event} />
        ))}
        {filteredEvents.length === 0 ? (
          <li className="py-4 text-center text-[11px] text-gray-400">{emptyMessage}</li>
        ) : null}
      </ul>
    </div>
  );
}

/**
 * Recent updates feed (last 50 WS events) with source filters and action-required badges.
 */
export function ActivitySidebar(props: ActivitySidebarProps): ReactElement | null {
  const { panel = false, sidebar = false, open = true, onClose } = props;
  const events = useNotificationsStore((s) => s.events);
  const user = useAuthStore((s) => s.user);
  const technicianScoped = user !== null && isTechnicianOnly(user.roles);

  if (panel && !open) {
    return null;
  }

  const feed = (
    <ActivityFeedBody
      events={events}
      technicianScoped={technicianScoped}
      onClose={onClose}
      panel={panel}
    />
  );

  if (panel && onClose !== undefined) {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[150] cursor-default bg-black/25"
          aria-label="Close activity panel"
          onClick={onClose}
        />
        <aside
          id="activity-panel"
          className="fixed bottom-0 right-0 top-[52px] z-[160] flex w-[min(100%,20rem)] flex-col border-l border-gray-200 bg-white shadow-xl"
          aria-label="Recent updates"
        >
          {feed}
        </aside>
      </>
    );
  }

  if (sidebar) {
    return (
      <aside
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        aria-label="Recent updates"
      >
        {feed}
      </aside>
    );
  }

  return (
    <aside
      className="flex max-h-[520px] min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      aria-label="Recent updates"
    >
      {feed}
    </aside>
  );
}
