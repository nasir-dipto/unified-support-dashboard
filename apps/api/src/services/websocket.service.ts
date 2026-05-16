import type { WsOutboundEnvelope } from '@usd/shared-types';
import { wsOutboundEnvelopeSchema } from '@usd/shared-types';
import { WebSocket } from 'ws';
import { getServerEnv } from '../config/loadEnv.js';

const orgClients = new Map<string, Set<WebSocket>>();

/**
 * Tracks an authenticated browser WebSocket for local `/ws` fan-out (WS_MODE=local).
 */
export function registerLocalWsClient(orgId: string, socket: WebSocket): void {
  let bucket = orgClients.get(orgId);
  if (bucket === undefined) {
    bucket = new Set();
    orgClients.set(orgId, bucket);
  }
  bucket.add(socket);
  const bucketRef = bucket;
  socket.once('close', () => {
    bucketRef.delete(socket);
    if (bucketRef.size === 0) {
      orgClients.delete(orgId);
    }
  });
}

/**
 * Clears all org buckets (Vitest teardown).
 */
export function clearLocalWsClientsForTests(): void {
  orgClients.clear();
}

/**
 * Returns the count of open local WebSocket clients across all orgs.
 */
export function getLocalWsConnectionCount(): number {
  let total = 0;
  for (const bucket of orgClients.values()) {
    total += bucket.size;
  }
  return total;
}

/**
 * Validates and delivers a realtime event to every open socket in the org.
 * In `gateway` mode: logs once and returns without error.
 */
export function broadcastWsEnvelope(envelope: WsOutboundEnvelope): void {
  const parsed = wsOutboundEnvelopeSchema.safeParse(envelope);
  if (!parsed.success) {
    return;
  }
  const env = getServerEnv();
  if (env.WS_MODE === 'gateway') {
    console.info('API Gateway WebSocket not configured');
    return;
  }
  const text = JSON.stringify(parsed.data);
  const bucket = orgClients.get(parsed.data.orgId);
  if (bucket === undefined) {
    return;
  }
  for (const client of bucket) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(text);
    }
  }
}
