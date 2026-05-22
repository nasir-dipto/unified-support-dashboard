import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { WebSocket } from 'ws';
import {
  broadcastWsEnvelope,
  clearLocalWsClientsForTests,
  getLocalWsConnectionCount,
  registerLocalWsClient,
} from './websocket.service.js';

vi.mock('../db/tables/ws-activity-events.js', () => ({
  putWsActivityEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('websocket.service', () => {
  beforeEach(() => {
    resetServerEnvForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetServerEnvForTests();
    clearLocalWsClientsForTests();
  });

  it('logs in gateway mode without fan-out', () => {
    process.env.WS_MODE = 'gateway';
    loadServerEnv();
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    broadcastWsEnvelope({
      type: 'ticket_updated',
      ticketId: 'jira_X',
      orgId: 'org-int',
      payload: {},
    });
    expect(spy).toHaveBeenCalledWith('API Gateway WebSocket not configured');
  });

  it('getLocalWsConnectionCount sums registered clients', () => {
    const fakeWs = {
      readyState: WebSocket.OPEN,
      once: vi.fn(),
    } as unknown as WebSocket;
    registerLocalWsClient('demo-org', fakeWs);
    expect(getLocalWsConnectionCount()).toBe(1);
  });
});
