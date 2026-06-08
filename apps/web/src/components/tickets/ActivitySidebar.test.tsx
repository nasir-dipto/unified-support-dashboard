import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ActivitySidebar } from './ActivitySidebar';
import { useNotificationsStore } from '../../store/notifications.store';

afterEach(() => {
  cleanup();
  useNotificationsStore.getState().clear();
});

describe('ActivitySidebar', () => {
  it('renders sidebar layout with scrollable feed', () => {
    render(<ActivitySidebar sidebar />);
    expect(screen.getByRole('complementary', { name: /live activity/i })).toBeInTheDocument();
    expect(screen.getByText(/waiting for websocket events/i)).toBeInTheDocument();
  });

  it('renders urgent alerts for critical ticket payloads', () => {
    useNotificationsStore.getState().pushEvent({
      type: 'ticket_updated',
      ticketId: 'jira_A',
      orgId: 'o',
      payload: { ticket: { priority: 'critical', summary: 'Down' } },
    });
    render(<ActivitySidebar />);
    expect(screen.getByText(/urgent alerts/i)).toBeTruthy();
    const urgentHeading = screen.getByText(/urgent alerts/i);
    const section = urgentHeading.closest('section');
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByRole('listitem').textContent).toContain('Down');
  });
});
