import { useEffect, useRef } from 'react';
import { wsOutboundEnvelopeSchema } from '@usd/shared-types';
import { fetchRecentActivity } from '../api/activity.js';
import { useAuthStore } from '../store/auth.store';
import { useNotificationsStore } from '../store/notifications.store';

/**
 * Converts HTTP API origin to WebSocket URL (`ws:` / `wss:`).
 */
export function httpOriginToWsOrigin(origin: string): string {
  if (origin.startsWith('https://')) {
    return `wss://${origin.slice('https://'.length)}`;
  }
  if (origin.startsWith('http://')) {
    return `ws://${origin.slice('http://'.length)}`;
  }
  return origin;
}

/**
 * Opens an authenticated `/ws` connection when a bearer token exists (local API server).
 * Silently ignores connection errors so gateway mode never surfaces UI failures.
 */
export function useUsdWebSocket(): void {
  const token = useAuthStore((s) => s.accessToken);
  const pushEvent = useNotificationsStore((s) => s.pushEvent);
  const seedEvents = useNotificationsStore((s) => s.seedEvents);
  const sockRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (token === null || token.length === 0) {
      return;
    }
    void fetchRecentActivity(50)
      .then((events) => {
        seedEvents(events);
      })
      .catch(() => {
        /* history is best-effort; live WS still connects */
      });
    const apiBase =
      import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL.length > 0
        ? import.meta.env.VITE_API_URL
        : 'http://localhost:3001';
    const wsBase = httpOriginToWsOrigin(apiBase);
    const wsUrl = `${wsBase}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    sockRef.current = ws;

    ws.onmessage = (evt: MessageEvent<string>) => {
      try {
        const parsedJson: unknown = JSON.parse(evt.data);
        const parsed = wsOutboundEnvelopeSchema.safeParse(parsedJson);
        if (parsed.success) {
          pushEvent(parsed.data);
        }
      } catch {
        /* malformed payloads ignored */
      }
    };

    ws.onerror = () => {
      /* intentional silence — WS_MODE=gateway has no listener */
    };

    return () => {
      ws.close();
      sockRef.current = null;
    };
  }, [token, pushEvent, seedEvents]);
}
