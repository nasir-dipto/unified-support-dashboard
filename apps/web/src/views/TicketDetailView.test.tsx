import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { TicketApiDto } from '@usd/shared-types';
import { TicketDetailView } from './TicketDetailView';

const baseTicket: TicketApiDto = {
  ticketId: 'jira_X',
  orgId: 'o',
  source: 'jira',
  externalId: 'X',
  summary: 'Page ticket',
  description: 'Body',
  priority: 'medium',
  status: 'open',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: 'u',
};

let ticketDetail: TicketApiDto | undefined = { ...baseTicket };
let isLoading = false;
let isError = false;
const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../hooks/useTickets', () => ({
  useTicketDetail: () => ({
    data: ticketDetail !== undefined ? { data: ticketDetail } : undefined,
    isLoading,
    isError,
  }),
  useLinkedTicketDetail: () => ({ data: undefined, isLoading: false }),
  useTicketComments: () => ({ data: { data: [], total: 0 }, isLoading: false }),
  usePostTicketComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useAI', () => ({
  useAiInvoke: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useHealthDetail', () => ({
  useHealthDetail: () => ({
    data: { helpdesk: { emailReplyEnabled: false } },
  }),
}));

vi.mock('../hooks/useKb', () => ({
  useKbSearch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useKbDraft: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useKbDraftExists: () => ({ data: false, isLoading: false }),
}));

vi.mock('../store/auth.store', () => ({
  useAuthStore: (selector: (s: { user: { orgId: string; email: string; roles: ['manager'] } }) => unknown) =>
    selector({ user: { orgId: 'o', email: 'manager@usd.dev', roles: ['manager'] } }),
}));

function renderPage(initialEntry = '/tickets/jira_X'): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/tickets/:ticketId" element={<TicketDetailView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TicketDetailView', () => {
  afterEach(() => {
    cleanup();
    ticketDetail = { ...baseTicket };
    isLoading = false;
    isError = false;
    navigateMock.mockReset();
  });

  it('renders ticket content on the page', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'X' })).toBeInTheDocument();
    expect(screen.getByText('Page ticket')).toBeInTheDocument();
  });

  it('navigates back when back control is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /back to tickets/i }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('shows loading state', () => {
    isLoading = true;
    ticketDetail = undefined;
    renderPage();
    expect(screen.getAllByText(/loading ticket/i).length).toBeGreaterThan(0);
  });

  it('shows not-found message when ticket is missing', () => {
    ticketDetail = undefined;
    isError = true;
    renderPage();
    expect(screen.getByText(/ticket not found/i)).toBeInTheDocument();
  });
});
