import { describe, expect, it } from 'vitest';
import type { WsOutboundEnvelope } from '@usd/shared-types';
import { scopeActivityEventsForRole } from './scopeActivityEvents.js';

const event = (ticketId: string): WsOutboundEnvelope => ({
  type: 'ticket_updated',
  ticketId,
  orgId: 'ti',
  payload: {},
});

describe('scopeActivityEventsForRole', () => {
  const events = [event('jira_A'), event('hd_1'), event('jira_B')];
  const mine = new Set(['jira_A']);

  it('returns all events for managers', () => {
    const out = scopeActivityEventsForRole(events, ['manager'], mine, 50);
    expect(out).toHaveLength(3);
  });

  it('returns all events for super_admin', () => {
    const out = scopeActivityEventsForRole(events, ['super_admin'], mine, 50);
    expect(out).toHaveLength(3);
  });

  it('filters to assigned tickets for technicians', () => {
    const out = scopeActivityEventsForRole(events, ['technician'], mine, 50);
    expect(out).toHaveLength(1);
    expect(out[0]?.ticketId).toBe('jira_A');
  });

  it('caps results to the requested limit after filtering', () => {
    const many = [event('jira_A'), event('jira_A'), event('jira_A')];
    const out = scopeActivityEventsForRole(many, ['technician'], new Set(['jira_A']), 2);
    expect(out).toHaveLength(2);
  });
});
