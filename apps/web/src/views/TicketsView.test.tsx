import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TicketsView } from '../views/TicketsView';

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
        total: 1,
      },
      isLoading: false,
      error: null,
    }),
  };
});

vi.mock('../hooks/useWebSocket', () => ({
  useUsdWebSocket: () => {},
}));

function renderWithQuery(ui: ReactElement): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('TicketsView', () => {
  it('renders ticket cards from query data', () => {
    renderWithQuery(<TicketsView />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Ticket Queue')).toBeInTheDocument();
  });

  it('renders activity sidebar', () => {
    renderWithQuery(<TicketsView />);
    expect(screen.getByRole('complementary', { name: /live activity/i })).toBeTruthy();
  });
});
