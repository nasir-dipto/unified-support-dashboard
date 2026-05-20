import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManagerSentimentTab } from './ManagerSentimentTab';

vi.mock('../../hooks/useSentiment', () => ({
  useSentimentSummary: () => ({
    isLoading: false,
    data: {
      counts: { positive: 1, neutral: 1, negative: 2, unanalyzed: 0 },
      trend: [{ weekStart: '2026-05-01', positive: 0, neutral: 0, negative: 1, avgScore: -0.5 }],
      byCustomer: [
        {
          customerEmail: 'a@x.com',
          customerLabel: 'a',
          sentiment: 'negative' as const,
          avgScore: -0.5,
          ticketCount: 1,
          churnRiskCount: 1,
        },
      ],
      byPriority: [{ priority: 'high' as const, positive: 0, neutral: 0, negative: 1 }],
      tickets: [
        {
          ticketId: 'hd_1',
          externalId: '1',
          summary: 'Test',
          priority: 'high' as const,
          status: 'open' as const,
          sentiment: 'negative' as const,
          sentimentScore: -0.5,
          churnRisk: true,
          sentimentAt: 't',
          createdAt: 't',
          updatedAt: 't',
        },
      ],
      total: 4,
    },
  }),
}));

vi.mock('../../hooks/useAI', () => ({
  useAiInvoke: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../components/sentiment/SentimentTrendChart', () => ({
  SentimentTrendChart: () => <div data-testid="trend-chart" />,
}));
vi.mock('../../components/sentiment/TicketsBySentimentChart', () => ({
  TicketsBySentimentChart: () => <div data-testid="tickets-chart" />,
}));
vi.mock('../../components/sentiment/CategorySentimentChart', () => ({
  CategorySentimentChart: () => <div data-testid="priority-chart" />,
}));
vi.mock('../../components/sentiment/CustomerSentimentChart', () => ({
  CustomerSentimentChart: () => <div data-testid="customer-chart" />,
}));

describe('ManagerSentimentTab', () => {
  it('renders sentiment stats and charts', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <ManagerSentimentTab />
      </QueryClientProvider>,
    );
    expect(screen.getAllByText('Negative').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('trend-chart')).toBeTruthy();
    expect(screen.getByText('By Priority')).toBeTruthy();
    expect(screen.getByText('HD-1')).toBeTruthy();
  });
});
