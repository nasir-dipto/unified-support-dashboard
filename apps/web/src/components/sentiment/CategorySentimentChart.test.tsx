import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategorySentimentChart } from './CategorySentimentChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="stacked-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('CategorySentimentChart', () => {
  it('renders stacked chart', () => {
    const { getByTestId } = render(
      <CategorySentimentChart
        data={[{ priority: 'high', positive: 1, neutral: 0, negative: 2 }]}
      />,
    );
    expect(getByTestId('stacked-chart')).toBeTruthy();
  });
});
