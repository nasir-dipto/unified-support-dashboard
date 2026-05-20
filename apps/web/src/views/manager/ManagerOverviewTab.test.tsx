import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import { ManagerOverviewTab } from './ManagerOverviewTab';

const ticket: TicketApiDto = {
  ticketId: 'jira_X',
  orgId: 'o',
  source: 'jira',
  externalId: 'X',
  summary: 'Test',
  priority: 'high',
  status: 'open',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const mutateAsync = vi.fn().mockResolvedValue({ briefing: '• Line one' });

vi.mock('../../hooks/useAI', () => ({
  useAiInvoke: () => ({
    mutateAsync,
    isPending: false,
    isError: false,
  }),
}));

describe('ManagerOverviewTab', () => {
  it('generates morning briefing on button click', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <ManagerOverviewTab tickets={[ticket]} onSelectTicket={() => {}} />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole('button', { name: /generate ai briefing/i }));
    expect(mutateAsync).toHaveBeenCalledWith({ feature: 'morning_briefing' });
  });
});
