import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import {
  DetailModal,
  formatTicketTimestamp,
  hasDisplayableDescription,
  originalDescriptionLabel,
} from './DetailModal';

const baseTicket: TicketApiDto = {
  ticketId: 'jira_X',
  orgId: 'o',
  source: 'jira',
  externalId: 'X',
  summary: 'Modal ticket',
  description: 'Body text',
  priority: 'high',
  status: 'open',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: 'u',
};

let ticketDetail: TicketApiDto = { ...baseTicket };

vi.mock('../../hooks/useTickets', () => ({
  useTicketDetail: () => ({
    data: { data: ticketDetail },
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

function renderModal(): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DetailModal ticketId="jira_X" open onClose={() => {}} />
    </QueryClientProvider>,
  );
}

describe('DetailModal helpers', () => {
  it('hasDisplayableDescription rejects empty and em dash', () => {
    expect(hasDisplayableDescription(undefined)).toBe(false);
    expect(hasDisplayableDescription('')).toBe(false);
    expect(hasDisplayableDescription('   ')).toBe(false);
    expect(hasDisplayableDescription('—')).toBe(false);
    expect(hasDisplayableDescription('Real text')).toBe(true);
  });

  it('originalDescriptionLabel varies by source', () => {
    expect(originalDescriptionLabel('jira')).toBe('Issue Description');
    expect(originalDescriptionLabel('helpdesk')).toBe('Original Request');
  });

  it('formatTicketTimestamp uses en-US medium date and short time', () => {
    expect(formatTicketTimestamp('2026-01-15T12:00:00.000Z')).toMatch(/Jan 15, 2026/);
  });
});

describe('DetailModal', () => {
  afterEach(() => {
    cleanup();
    ticketDetail = { ...baseTicket };
  });

  it('renders original description as first conversation item for Jira', () => {
    renderModal();
    const bubble = screen.getByTestId('ticket-original-description');
    expect(screen.getByText('Issue Description')).toBeTruthy();
    expect(screen.getByText('Body text')).toBeTruthy();
    expect(screen.getByText(formatTicketTimestamp('2026-01-15T12:00:00.000Z'))).toBeTruthy();
    expect(screen.getByText('Hello thread')).toBeTruthy();
    const list = bubble.parentElement;
    expect(list?.firstElementChild).toBe(bubble);
    expect(screen.getByRole('button', { name: /post comment/i })).toBeTruthy();
  });

  it('renders Original Request label for Helpdesk', () => {
    ticketDetail = {
      ...baseTicket,
      ticketId: 'hd_1',
      source: 'helpdesk',
      externalId: '1',
      description: 'Printer offline',
    };
    renderModal();
    expect(screen.getByText('Original Request')).toBeTruthy();
    expect(screen.getByText('Printer offline')).toBeTruthy();
  });

  it('hides original description when empty or em dash', () => {
    ticketDetail = { ...baseTicket, description: '—' };
    renderModal();
    expect(screen.queryByTestId('ticket-original-description')).toBeNull();
    expect(screen.queryByText('Issue Description')).toBeNull();
  });
});
