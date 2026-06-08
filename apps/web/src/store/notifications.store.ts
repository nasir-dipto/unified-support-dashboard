import type { WsOutboundEnvelope } from '@usd/shared-types';
import { create } from 'zustand';
import { isActionRequired } from '../utils/activity-feed.js';

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
 * Returns feed entries that require technician action (see `isActionRequired`).
 */
export function filterUrgentWsEvents(events: WsOutboundEnvelope[]): WsOutboundEnvelope[] {
  return events.filter(isActionRequired);
}
