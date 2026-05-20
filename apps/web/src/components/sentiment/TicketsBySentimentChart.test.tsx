import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TicketsBySentimentChart } from './TicketsBySentimentChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

describe('TicketsBySentimentChart', () => {
  it('renders bar chart', () => {
    const { getByTestId } = render(
      <TicketsBySentimentChart
        counts={{ positive: 1, neutral: 2, negative: 3, unanalyzed: 0 }}
      />,
    );
    expect(getByTestId('bar-chart')).toBeTruthy();
  });
});
