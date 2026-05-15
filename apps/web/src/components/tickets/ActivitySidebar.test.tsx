import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivitySidebar } from './ActivitySidebar';
import { useNotificationsStore } from '../../store/notifications.store';

describe('ActivitySidebar', () => {
  it('renders urgent alerts for critical ticket payloads', () => {
    useNotificationsStore.getState().clear();
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
