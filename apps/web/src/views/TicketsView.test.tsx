import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TicketsView } from '../views/TicketsView';

vi.mock('../hooks/useTickets', () => ({
  useTicketsList: () => ({
    data: {
      data: [
        {
          ticketId: 'jira_X-1',
          orgId: 'o',
          source: 'jira' as const,
          externalId: 'X-1',
          summary: 'Hello',
          priority: 'medium' as const,
          status: 'open' as const,
          createdAt: 't',
          updatedAt: 't',
        },
      ],
      total: 1,
    },
    isLoading: false,
    error: null,
  }),
}));

describe('TicketsView', () => {
  it('renders ticket cards from query data', () => {
    render(<TicketsView />);
    expect(screen.getByTestId('ticket-summary')).toHaveTextContent('Hello');
  });
});
