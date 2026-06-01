import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TicketStatsRow } from './TicketStatsRow';
import { useAuthStore } from '../../store/auth.store';
import { emptyTicketListFacets } from '../../test/ticket-list-fixtures';

describe('TicketStatsRow', () => {
  afterEach(() => {
    useAuthStore.getState().clear();
  });

  it('renders counts from API facets', () => {
    useAuthStore.getState().setSession('a', 'r', {
      userId: '01USER',
      orgId: 'demo-org',
      email: 'admin@usd.dev',
      roles: ['super_admin'],
    });
    render(
      <TicketStatsRow
        facets={emptyTicketListFacets({
          sources: { jira: 3, helpdesk: 2 },
          priorities: { critical: 1, high: 0, medium: 0, low: 0 },
          statuses: { open: 2, in_progress: 1, pending: 2, resolved: 0, closed: 0 },
          mineCount: 4,
        })}
      />,
    );
    expect(screen.getByText('Open').previousElementSibling?.textContent).toBe('5');
    expect(screen.getByText('Critical').previousElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Jira tickets').previousElementSibling?.textContent).toBe('3');
    expect(screen.getByText('ME tickets').previousElementSibling?.textContent).toBe('2');
  });

  it('shows My Tickets label for technician-only view', () => {
    render(<TicketStatsRow facets={emptyTicketListFacets()} technicianOnly />);
    expect(screen.getByText('My Tickets')).toBeInTheDocument();
  });
});
