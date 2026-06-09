import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminKbTab } from './AdminKbTab';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const mockArticles = [
  {
    kbId: '01HZKB1',
    orgId: 'demo-org',
    title: 'VPN fix',
    problem: 'Users cannot connect',
    rootCause: 'Bad config',
    resolutionSteps: 'Reset VPN',
    tags: ['vpn'],
    sourceTicketIds: ['hd_4', 'jira_SCRUM-5'],
    status: 'draft' as const,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    kbId: '01HZKB2',
    orgId: 'demo-org',
    title: 'No sources article',
    problem: 'Misc',
    rootCause: 'Unknown',
    resolutionSteps: 'N/A',
    tags: [],
    sourceTicketIds: [],
    status: 'published' as const,
    createdBy: 'u1',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    publishedAt: '2026-01-02T00:00:00.000Z',
  },
];

vi.mock('../../hooks/useKb', () => ({
  useKbArticles: () => ({
    data: mockArticles,
    isLoading: false,
    isError: false,
  }),
  usePublishKbArticle: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteKbArticle: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function renderTab(): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AdminKbTab />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('AdminKbTab', () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
  });

  it('shows source ticket IDs below article title', () => {
    renderTab();
    const sources = screen.getByTestId('kb-article-sources');
    expect(sources).toHaveTextContent('Sources:');
    expect(sources).toHaveTextContent('hd_4');
    expect(sources).toHaveTextContent('jira_SCRUM-5');
  });

  it('hides sources line when article has no source ticket IDs', () => {
    renderTab();
    const allSources = screen.getAllByTestId('kb-article-sources');
    expect(allSources).toHaveLength(1);
  });

  it('navigates to ticket detail when a source ticket id is clicked', async () => {
    const user = userEvent.setup();
    renderTab();
    await user.click(screen.getByRole('button', { name: 'hd_4' }));
    expect(navigateMock).toHaveBeenCalledWith('/tickets/hd_4');
  });
});
