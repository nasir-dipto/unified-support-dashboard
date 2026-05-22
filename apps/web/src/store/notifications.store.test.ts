import { describe, expect, it } from 'vitest';
import { useNotificationsStore } from './notifications.store.js';

describe('notifications.store', () => {
  it('seedEvents replaces buffer and trims to 50', () => {
    useNotificationsStore.getState().clear();
    const events = Array.from({ length: 60 }, (_, i) => ({
      type: 'ticket_updated' as const,
      ticketId: `t-${String(i)}`,
      orgId: 'o',
      payload: {},
    }));
    useNotificationsStore.getState().seedEvents(events);
    expect(useNotificationsStore.getState().events).toHaveLength(50);
    expect(useNotificationsStore.getState().events[0]?.ticketId).toBe('t-0');
    useNotificationsStore.getState().clear();
  });
});
