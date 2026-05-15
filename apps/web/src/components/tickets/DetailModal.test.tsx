import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DetailModal } from './DetailModal';

vi.mock('../../hooks/useTickets', () => ({
  useTicketDetail: () => ({
    data: {
      data: {
        ticketId: 'jira_X',
        orgId: 'o',
        source: 'jira' as const,
        externalId: 'X',
        summary: 'Modal ticket',
        description: 'Body text',
        priority: 'high' as const,
        status: 'open' as const,
        createdAt: 'c',
        updatedAt: 'u',
      },
    },
    isLoading: false,
  }),
  useTicketComments: () => ({
    data: {
      data: [
        {
          ticketId: 'jira_X',
          commentId: 'c1',
          body: 'Hello thread',
          createdAt: 't',
        },
      ],
      total: 1,
    },
    isLoading: false,
  }),
  usePostTicketComment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('DetailModal', () => {
  it('renders ticket header, description, and comments', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <DetailModal ticketId="jira_X" open onClose={() => {}} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Modal ticket')).toBeTruthy();
    expect(screen.getByText('Body text')).toBeTruthy();
    expect(screen.getByText('Hello thread')).toBeTruthy();
    expect(screen.getByRole('button', { name: /post comment/i })).toBeTruthy();
  });
});
