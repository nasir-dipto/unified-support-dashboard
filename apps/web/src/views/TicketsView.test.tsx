import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TicketsView } from '../views/TicketsView';
import { defaultTicketListPagination, emptyTicketListFacets } from '../test/ticket-list-fixtures';

afterEach(() => {
  cleanup();
});

vi.mock('../hooks/useTickets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useTickets')>();
  return {
    ...actual,
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
        pagination: defaultTicketListPagination({ total: 1, totalPages: 1 }),
        facets: emptyTicketListFacets({ viewCounts: { all: 1, mine: 0, jira: 1, me: 0 } }),
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }),
  };
});

vi.mock('../hooks/useWebSocket', () => ({
  useUsdWebSocket: () => {},
}));

function renderWithQuery(ui: ReactElement): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('TicketsView', () => {
  it('renders ticket cards from query data', () => {
    renderWithQuery(<TicketsView />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Ticket Queue')).toBeInTheDocument();
  });

  it('opens activity panel when Activity toggle is clicked', async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsView />);
    expect(screen.queryByRole('complementary', { name: /live activity/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /activity/i }));
    expect(screen.getByRole('complementary', { name: /live activity/i })).toBeTruthy();
  });
});
