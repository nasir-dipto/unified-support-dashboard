import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { AuthUserPublic } from '@usd/shared-types';
import { TechnicianTicketsView, getDefaultTicketViewTab } from './TechnicianTicketsView';
import { defaultTicketListPagination, emptyTicketListFacets } from '../test/ticket-list-fixtures';
import { TICKET_VIEW_MODE_STORAGE_KEY } from '../hooks/useViewMode';
import { useAuthStore } from '../store/auth.store';

const manager: AuthUserPublic = {
  userId: 'm1',
  orgId: 'ti',
  email: 'manager@usd.dev',
  roles: ['manager'],
};

const technician: AuthUserPublic = {
  userId: 't1',
  orgId: 'ti',
  email: 'technician@usd.dev',
  roles: ['technician'],
  displayName: 'Nasir Dipto Personal',
};

vi.mock('../hooks/useTickets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useTickets')>();
  return {
    ...actual,
    useTicketsList: () => ({
      data: {
        data: [
          {
            ticketId: 'jira_X-1',
            orgId: 'ti',
            source: 'jira' as const,
            externalId: 'X-1',
            summary: 'Hello ticket',
            priority: 'medium' as const,
            status: 'open' as const,
            createdAt: 't',
            updatedAt: 't',
          },
          {
            ticketId: 'hd_9',
            orgId: 'ti',
            source: 'helpdesk' as const,
            externalId: '9',
            summary: 'HD sample',
            priority: 'high' as const,
            status: 'in_progress' as const,
            customerEmail: 'user@example.com',
            createdAt: 't',
            updatedAt: 't',
          },
        ],
        pagination: defaultTicketListPagination({ total: 2, totalPages: 1 }),
        facets: emptyTicketListFacets({ viewCounts: { all: 2, mine: 1, jira: 1, me: 1 } }),
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

function renderQueue(ui: ReactElement): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/tickets']}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('getDefaultTicketViewTab', () => {
  it('defaults technicians to My Tickets', () => {
    expect(getDefaultTicketViewTab(technician)).toBe('mine');
  });

  it('defaults manager to All', () => {
    expect(getDefaultTicketViewTab(manager)).toBe('all');
  });

  it('defaults super_admin to All', () => {
    expect(
      getDefaultTicketViewTab({
        ...manager,
        email: 'admin@usd.dev',
        roles: ['super_admin'],
      }),
    ).toBe('all');
  });
});

describe('TechnicianTicketsView', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      accessToken: 'tok',
      refreshToken: 'ref',
      user: manager,
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clear();
    localStorage.clear();
  });

  it('renders list layout by default', () => {
    renderQueue(<TechnicianTicketsView />);
    expect(screen.getByText('Hello ticket')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^List$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Customer')).toBeNull();
  });

  it('switches to grid layout and shows richer card fields', async () => {
    const user = userEvent.setup();
    renderQueue(<TechnicianTicketsView />);
    await user.click(screen.getByRole('button', { name: /^Grid$/i }));
    expect(localStorage.getItem(TICKET_VIEW_MODE_STORAGE_KEY)).toBe('grid');
    expect(screen.getByRole('button', { name: /^Grid$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('keeps tickets visible when sort changes in grid mode', async () => {
    const user = userEvent.setup();
    renderQueue(<TechnicianTicketsView />);
    await user.click(screen.getByRole('button', { name: /^Grid$/i }));
    await user.selectOptions(screen.getByLabelText(/sort tickets/i), 'priority');
    expect(screen.getByText('Hello ticket')).toBeInTheDocument();
    expect(screen.getByText('HD sample')).toBeInTheDocument();
  });
});
