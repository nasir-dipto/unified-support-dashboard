import type { WsOutboundEnvelope } from '@usd/shared-types';
import { StatusDot, usdColors } from '@usd/ui';
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
      className="rounded-xl border border-gray-200 bg-white p-4"
      aria-label="Live activity"
    >
      <div className="flex items-center gap-2">
        <StatusDot color={usdColors.teal} size={10} />
        <h2 className="text-sm font-bold text-gray-900">Live activity</h2>
      </div>
      <p className="mt-1 text-xs text-gray-500">Last 50 realtime events (newest first).</p>

      {urgent.length > 0 ? (
        <section className="mt-4 border-b border-red-100 pb-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-usd-red">Urgent alerts</h3>
          <ul className="mt-2 space-y-2">
            {urgent.map((ev, idx) => (
              <li
                key={`${ev.ticketId}-${ev.type}-${String(idx)}`}
                className="rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-900"
              >
                <span className="font-mono font-bold">{ev.ticketId}</span> · {summarizeEvent(ev)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="mt-4 max-h-[480px] space-y-2 overflow-y-auto">
        {events.map((ev, idx) => (
          <li
            key={`${ev.type}-${ev.ticketId}-${String(idx)}`}
            className="rounded-lg border border-gray-100 px-2 py-2 text-xs"
          >
            <div className="flex flex-wrap gap-1">
              <span className="rounded bg-gray-100 px-1.5 font-semibold text-gray-700">{ev.type}</span>
              <span className="font-mono text-gray-500">{ev.ticketId}</span>
            </div>
            <p className="mt-1 text-gray-700">{summarizeEvent(ev)}</p>
          </li>
        ))}
      </ul>
      {events.length === 0 ? (
        <p className="mt-4 text-xs text-gray-400">Waiting for websocket events…</p>
      ) : null}
    </aside>
  );
}
