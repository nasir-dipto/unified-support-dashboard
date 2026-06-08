import type { Request, Response } from 'express';
import type { ActivityRecentResponse, SupportRole, WsOutboundEnvelope } from '@usd/shared-types';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import * as ticketsTable from '../db/tables/tickets.js';
import * as wsActivityTable from '../db/tables/ws-activity-events.js';

const events: WsOutboundEnvelope[] = [
  { type: 'ticket_updated', ticketId: 'jira_A', orgId: 'ti', payload: {} },
  { type: 'ticket_updated', ticketId: 'hd_9', orgId: 'ti', payload: {} },
  { type: 'comment_added', ticketId: 'jira_B', orgId: 'ti', payload: { body: 'hi' } },
];

const authState: {
  userId: string;
  orgId: string;
  email: string;
  roles: SupportRole[];
  displayName?: string;
} = {
  userId: 'u1',
  orgId: 'ti',
  email: 'tech@usd.dev',
  roles: ['technician'],
  displayName: 'Tech User',
};

vi.mock('../db/tables/ws-activity-events.js', () => ({
  listRecentWsActivityEvents: vi.fn(),
}));

vi.mock('../db/tables/tickets.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/tables/tickets.js')>();
  return {
    ...actual,
    listAssignedTicketIds: vi.fn(),
  };
});

vi.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, _res: Response, next: () => void) => {
    req.auth = { ...authState };
    next();
  },
}));

describe('activity.handlers', () => {
  beforeEach(() => {
    authState.roles = ['technician'];
    vi.mocked(wsActivityTable.listRecentWsActivityEvents).mockResolvedValue(events);
    vi.mocked(ticketsTable.listAssignedTicketIds).mockResolvedValue(new Set(['jira_A']));
  });

  it('scopes activity to assigned tickets for technicians', async () => {
    const res = await request(createApp()).get('/api/activity/recent');
    expect(res.status).toBe(200);
    const body = res.body as ActivityRecentResponse;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.ticketId).toBe('jira_A');
    expect(body.total).toBe(1);
    expect(ticketsTable.listAssignedTicketIds).toHaveBeenCalled();
  });

  it('returns all org events for managers', async () => {
    authState.roles = ['manager'];
    const res = await request(createApp()).get('/api/activity/recent');
    expect(res.status).toBe(200);
    const body = res.body as ActivityRecentResponse;
    expect(body.data).toHaveLength(3);
    expect(body.total).toBe(3);
  });
});
