import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import {
  broadcastWsEnvelope,
  clearLocalWsClientsForTests,
} from './websocket.service.js';

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
});
