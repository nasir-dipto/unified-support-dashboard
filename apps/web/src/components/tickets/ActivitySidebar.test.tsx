import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ActivitySidebar } from './ActivitySidebar';
import { useNotificationsStore } from '../../store/notifications.store';

afterEach(() => {
  cleanup();
  useNotificationsStore.getState().clear();
});

describe('ActivitySidebar', () => {
  it('renders sidebar with empty state', () => {
    render(<ActivitySidebar sidebar />);
    expect(screen.getByRole('complementary', { name: /recent updates/i })).toBeInTheDocument();
    expect(screen.getByText(/recent updates across tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/no recent updates/i)).toBeInTheDocument();
  });

  it('renders source pill, display id, time-ago, status, and attribution', () => {
    useNotificationsStore.getState().pushEvent({
      type: 'ticket_updated',
      ticketId: 'hd_501',
      orgId: 'ti',
      payload: {
        ticket: {
          source: 'helpdesk',
          externalId: '501',
          summary: 'VPN not connecting',
          status: 'in_progress',
          priority: 'medium',
          assigneeId: 'tech@usd.dev',
          updatedAt: '2026-06-08T11:55:00.000Z',
        },
      },
    });
    render(<ActivitySidebar sidebar />);
    const entry = screen.getByRole('listitem');
    expect(entry.textContent).toContain('ME');
    expect(entry.textContent).toContain('HD-501');
    expect(entry.textContent).toContain('VPN not connecting');
    expect(entry.textContent).toMatch(/status:/i);
    expect(entry.textContent).toMatch(/by tech@usd\.dev/i);
  });

  it('shows action required badge and urgent count for high-priority open tickets', () => {
    useNotificationsStore.getState().pushEvent({
      type: 'ticket_updated',
      ticketId: 'jira_SUP-99',
      orgId: 'ti',
      payload: {
        ticket: {
          source: 'jira',
          externalId: 'SUP-99',
          summary: 'Production outage',
          status: 'open',
          priority: 'critical',
          updatedAt: '2026-06-08T10:00:00.000Z',
        },
      },
    });
    render(<ActivitySidebar sidebar />);
    expect(screen.getByText(/1 urgent/i)).toBeInTheDocument();
    const entry = screen.getByRole('listitem');
    expect(entry.textContent).toMatch(/action required/i);
    expect(entry.textContent).toContain('Jira');
    expect(entry.textContent).toContain('SUP-99');
  });

  it('filters feed entries by source pills', async () => {
    const user = userEvent.setup();
    useNotificationsStore.getState().seedEvents([
      {
        type: 'ticket_updated',
        ticketId: 'jira_A-1',
        orgId: 'ti',
        payload: {
          ticket: { source: 'jira', externalId: 'A-1', summary: 'Jira one', updatedAt: '2026-06-08T12:00:00.000Z' },
        },
      },
      {
        type: 'ticket_updated',
        ticketId: 'hd_2',
        orgId: 'ti',
        payload: {
          ticket: { source: 'helpdesk', externalId: '2', summary: 'HD two', updatedAt: '2026-06-08T12:00:00.000Z' },
        },
      },
    ]);
    render(<ActivitySidebar sidebar />);
    expect(screen.getByText('Jira one')).toBeInTheDocument();
    expect(screen.getByText('HD two')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Jira$/i }));
    expect(screen.getByText('Jira one')).toBeInTheDocument();
    expect(screen.queryByText('HD two')).toBeNull();
  });
});
