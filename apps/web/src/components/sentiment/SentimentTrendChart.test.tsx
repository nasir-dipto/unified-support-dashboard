import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SentimentTrendChart } from './SentimentTrendChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('SentimentTrendChart', () => {
  it('renders chart when data present', () => {
    const { getByTestId } = render(
      <SentimentTrendChart
        data={[{ weekStart: '2026-05-01', positive: 1, neutral: 0, negative: 2, avgScore: -0.2 }]}
      />,
    );
    expect(getByTestId('line-chart')).toBeTruthy();
  });
});
