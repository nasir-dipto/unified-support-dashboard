import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportTicketRecord } from '@usd/shared-types';
import * as websocketService from '../services/websocket.service.js';
import { broadcastTicketLifecycleEvent } from './ticket-broadcast.js';

vi.mock('../services/websocket.service.js', () => ({
  broadcastWsEnvelope: vi.fn(),
}));

const sample = (): SupportTicketRecord => ({
  ticketId: 'jira_ABC-1',
  orgId: 'org-int',
  source: 'jira',
  externalId: 'ABC-1',
  summary: 'S',
  priority: 'medium',
  status: 'open',
  createdAt: 'c',
  updatedAt: 'u',
});

describe('broadcastTicketLifecycleEvent', () => {
  beforeEach(() => {
    vi.mocked(websocketService.broadcastWsEnvelope).mockClear();
  });

  it('broadcasts ticket_created when no prior record exists', () => {
    broadcastTicketLifecycleEvent(undefined, sample());
    expect(websocketService.broadcastWsEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ticket_created', ticketId: 'jira_ABC-1' }),
    );
  });

  it('broadcasts ticket_resolved on first transition into a terminal state', () => {
    const prev = sample();
    const next = { ...prev, status: 'resolved' as const, updatedAt: 'u2' };
    broadcastTicketLifecycleEvent(prev, next);
    expect(websocketService.broadcastWsEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ticket_resolved' }),
    );
  });
});
