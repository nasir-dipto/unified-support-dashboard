import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import { CommentModal } from './CommentModal';

const baseTicket: TicketApiDto = {
  ticketId: 'jira_X',
  orgId: 'o',
  source: 'jira',
  externalId: 'X',
  summary: 'Modal ticket',
  description: 'Body',
  priority: 'medium',
  status: 'open',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: 'u',
};

const mutateAsyncMock = vi.fn();

vi.mock('../../hooks/useTickets', () => ({
  usePostTicketComment: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('../../hooks/useAI', () => ({
  useAiInvoke: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

function renderModal(): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommentModal ticket={baseTicket} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('CommentModal', () => {
  afterEach(() => {
    cleanup();
    mutateAsyncMock.mockReset();
  });

  it('shows an error when posting a comment fails', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValueOnce(new Error('network'));
    renderModal();
    await user.type(screen.getByPlaceholderText(/add an internal comment/i), 'Hello');
    await user.click(screen.getByRole('button', { name: /post comment/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to send — please try again.');
  });
});
