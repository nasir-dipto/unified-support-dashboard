import type { PrioritySentimentBreakdown } from '@usd/shared-types';
import { usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type CategorySentimentChartProps = {
  data: PrioritySentimentBreakdown[];
};

/**
 * Stacked bar chart — sentiment by priority (labeled "By Priority" in UI).
 */
export function CategorySentimentChart(props: CategorySentimentChartProps): ReactElement {
  const { data } = props;
  const chartData = data.map((d) => ({
    priority: d.priority,
    positive: d.positive,
    neutral: d.neutral,
    negative: d.negative,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="positive" stackId="a" fill={usdColors.teal} />
        <Bar dataKey="neutral" stackId="a" fill={usdColors.amber} />
        <Bar dataKey="negative" stackId="a" fill={usdColors.red} />
      </BarChart>
    </ResponsiveContainer>
  );
}
