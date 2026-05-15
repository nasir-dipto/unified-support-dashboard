import { describe, expect, it } from 'vitest';
import { filterUrgentWsEvents, useNotificationsStore } from './notifications.store';

describe('notifications.store', () => {
  it('keeps only fifty newest events', () => {
    useNotificationsStore.getState().clear();
    for (let i = 0; i < 55; i += 1) {
      useNotificationsStore.getState().pushEvent({
        type: 'ticket_updated',
        ticketId: `t-${String(i)}`,
        orgId: 'o',
        payload: {},
      });
    }
    expect(useNotificationsStore.getState().events).toHaveLength(50);
  });

  it('surfaces critical ticket payloads as urgent', () => {
    const urgent = filterUrgentWsEvents([
      {
        type: 'ticket_updated',
        ticketId: 'jira_X',
        orgId: 'o',
        payload: { ticket: { priority: 'critical' } },
      },
      {
        type: 'ticket_updated',
        ticketId: 'jira_Y',
        orgId: 'o',
        payload: { ticket: { priority: 'low' } },
      },
    ]);
    expect(urgent).toHaveLength(1);
    expect(urgent[0]?.ticketId).toBe('jira_X');
  });
});
