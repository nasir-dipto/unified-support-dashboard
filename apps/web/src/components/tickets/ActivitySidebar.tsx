import type { WsOutboundEnvelope } from '@usd/shared-types';
import type { ReactElement } from 'react';
import { filterUrgentWsEvents, useNotificationsStore } from '../../store/notifications.store';

function summarizeEvent(ev: WsOutboundEnvelope): string {
  const ticket = ev.payload['ticket'];
  if (ticket !== undefined && typeof ticket === 'object' && ticket !== null && 'summary' in ticket) {
    const s = (ticket as { summary?: unknown }).summary;
    if (typeof s === 'string' && s.length > 0) {
      return s;
    }
  }
  if (ev.type === 'comment_added') {
    const body = ev.payload['body'];
    return typeof body === 'string' ? body.slice(0, 120) : 'New comment';
  }
  return ev.type.replace(/_/g, ' ');
}

/**
 * Live activity feed (last 50 WS events) plus urgent critical-priority alerts.
 */
export function ActivitySidebar(): ReactElement {
  const events = useNotificationsStore((s) => s.events);
  const urgent = filterUrgentWsEvents(events);

  return (
    <aside
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      aria-label="Live activity"
    >
      <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
      <p className="mt-1 text-xs text-slate-500">Last 50 realtime events (newest first).</p>

      {urgent.length > 0 ? (
        <section className="mt-4 border-b border-red-100 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Urgent alerts
          </h3>
          <ul className="mt-2 space-y-2">
            {urgent.map((ev, idx) => (
              <li
                key={`${ev.ticketId}-${ev.type}-${String(idx)}`}
                className="rounded bg-red-50 px-2 py-1 text-xs text-red-900"
              >
                <span className="font-mono">{ev.ticketId}</span> · {summarizeEvent(ev)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="mt-4 max-h-[480px] space-y-3 overflow-y-auto text-xs">
        {events.map((ev, idx) => (
          <li
            key={`${ev.type}-${ev.ticketId}-${String(idx)}`}
            className="border-l-2 border-slate-200 pl-2"
          >
            <div className="flex flex-wrap gap-1">
              <span className="rounded bg-slate-100 px-1 font-medium text-slate-700">{ev.type}</span>
              <span className="font-mono text-slate-600">{ev.ticketId}</span>
            </div>
            <p className="mt-1 text-slate-700">{summarizeEvent(ev)}</p>
          </li>
        ))}
      </ul>
      {events.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">Waiting for websocket events…</p>
      ) : null}
    </aside>
  );
}
