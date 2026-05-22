import type { WsOutboundEnvelope } from '@usd/shared-types';
import { create } from 'zustand';

const MAX_EVENTS = 50;

type NotificationsState = {
  events: WsOutboundEnvelope[];
  /** Prepends an event and trims to the last 50 (newest first). */
  pushEvent: (event: WsOutboundEnvelope) => void;
  /** Replaces the feed with persisted history (newest first). */
  seedEvents: (events: WsOutboundEnvelope[]) => void;
  clear: () => void;
};

/**
 * Client-side realtime feed buffer (Phase 4). Server state stays in TanStack Query.
 */
export const useNotificationsStore = create<NotificationsState>((set) => ({
  events: [],
  pushEvent: (event) => {
    set((state) => ({
      events: [event, ...state.events].slice(0, MAX_EVENTS),
    }));
  },
  seedEvents: (events) => {
    set({ events: events.slice(0, MAX_EVENTS) });
  },
  clear: () => {
    set({ events: [] });
  },
}));

/**
 * Returns urgent feed entries where the embedded ticket snapshot has critical priority.
 */
export function filterUrgentWsEvents(events: WsOutboundEnvelope[]): WsOutboundEnvelope[] {
  return events.filter((ev) => {
    const ticket = ev.payload['ticket'];
    if (ticket === undefined || typeof ticket !== 'object' || ticket === null) {
      return false;
    }
    const row = ticket as { priority?: unknown };
    return row.priority === 'critical';
  });
}
