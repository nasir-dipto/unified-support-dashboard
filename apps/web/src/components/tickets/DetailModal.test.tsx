import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const mutateAsyncMock = vi.fn();

vi.mock('../../hooks/useAI', () => ({
  useAiInvoke: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('../../hooks/useHealthDetail', () => ({
  useHealthDetail: () => ({
    data: {
      status: 'ok',
      version: '1.0.0',
      dynamodb: 'connected',
      redis: 'connected',
      postgres: 'connected',
      websocket: { connections: 0 },
      helpdesk: { emailReplyEnabled: false },
      uptime: 1,
    },
  }),
}));

const kbSearchMock = vi.fn();
const kbDraftMock = vi.fn();

vi.mock('../../hooks/useKb', () => ({
  useKbSearch: () => ({
    mutateAsync: kbSearchMock,
    isPending: false,
  }),
  useKbDraft: () => ({
    mutateAsync: kbDraftMock,
    isPending: false,
  }),
  useCreateKbArticle: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

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
          commentSource: 'jira_comment',
          createdAt: '2026-01-16T10:00:00.000Z',
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
    mutateAsyncMock.mockReset();
    kbSearchMock.mockReset();
    kbDraftMock.mockReset();
  });

  it('renders original description as first conversation item for Jira', () => {
    renderModal();
    const bubble = screen.getByTestId('ticket-original-description');
    expect(screen.getByText('Issue Description')).toBeTruthy();
    expect(screen.getByText('Body text')).toBeTruthy();
    expect(bubble).toHaveTextContent(formatTicketTimestamp('2026-01-15T12:00:00.000Z'));
    expect(screen.getByText('Hello thread')).toBeTruthy();
    const list = bubble.parentElement;
    expect(list?.firstElementChild).toBe(bubble);
    expect(screen.getByRole('button', { name: /^comment$/i })).toBeTruthy();
    expect(screen.getByText('Jira comment')).toBeTruthy();
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

  it('calls triage_suggest when AI suggest is clicked', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({
      engineerAction: 'Check auth logs',
      riskLevel: 'HIGH',
      suggestedAssignee: 'bob',
    });
    renderModal();
    await user.click(screen.getByRole('button', { name: /ai: suggest action/i }));
    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        feature: 'triage_suggest',
        ticketId: 'jira_X',
      });
    });
    expect(screen.getByText('Check auth logs')).toBeTruthy();
    expect(screen.getByText(/Suggested assignee/i)).toBeTruthy();
    expect(screen.getByText('bob')).toBeTruthy();
  });

  it('drafts comment with selected tone', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ draft: 'Draft body', tone: 'technical' });
    renderModal();
    await user.click(screen.getByRole('button', { name: /^technical$/i }));
    await user.click(screen.getByRole('button', { name: /ai: draft comment/i }));
    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        feature: 'comment_draft',
        ticketId: 'jira_X',
        tone: 'technical',
      });
    });
    expect(screen.getByPlaceholderText(/internal comment/i)).toHaveValue('Draft body');
  });

  it('shows KB search note for open tickets', async () => {
    const user = userEvent.setup();
    kbSearchMock.mockResolvedValue([]);
    renderModal();
    expect(screen.getByText(/best results on resolved tickets/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /search kb/i }));
    await waitFor(() => {
      expect(kbSearchMock).toHaveBeenCalled();
    });
  });

  it('generates KB draft when button clicked', async () => {
    const user = userEvent.setup();
    kbDraftMock.mockResolvedValue({
      title: 'Fix VPN',
      problem: 'VPN down',
      rootCause: 'Config',
      resolutionSteps: 'Reset',
      tags: ['vpn'],
      sourceTicketIds: ['jira_X'],
    });
    renderModal();
    await user.click(screen.getByRole('button', { name: /generate kb draft/i }));
    await waitFor(() => {
      expect(kbDraftMock).toHaveBeenCalledWith('jira_X');
    });
    expect(screen.getByDisplayValue('Fix VPN')).toBeTruthy();
  });
});
