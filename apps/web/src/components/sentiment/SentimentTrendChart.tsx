import type { SentimentTrendPoint } from '@usd/shared-types';
import { usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type SentimentTrendChartProps = {
  data: SentimentTrendPoint[];
};

/**
 * Week-by-week sentiment trend (LineChart).
 */
export function SentimentTrendChart(props: SentimentTrendChartProps): ReactElement {
  const { data } = props;
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">No trend data yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="weekStart" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="negative" stroke={usdColors.red} strokeWidth={2} />
        <Line type="monotone" dataKey="neutral" stroke={usdColors.amber} strokeWidth={2} />
        <Line type="monotone" dataKey="positive" stroke={usdColors.teal} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
