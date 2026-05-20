import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerSentimentChart } from './CustomerSentimentChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

describe('CustomerSentimentChart', () => {
  it('shows empty state', () => {
    render(<CustomerSentimentChart rows={[]} />);
    expect(screen.getByText(/No customer data/)).toBeTruthy();
  });
});
