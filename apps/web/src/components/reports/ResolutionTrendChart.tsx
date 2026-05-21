import type { ResolutionTrendPoint } from '@usd/shared-types';
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

export type ResolutionTrendChartProps = {
  data: ResolutionTrendPoint[];
};

/**
 * Weekly opened vs resolved (line chart).
 */
export function ResolutionTrendChart(props: ResolutionTrendChartProps): ReactElement {
  const { data } = props;
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">No resolution data for this period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="opened" stroke={usdColors.indigo} strokeWidth={2} />
        <Line type="monotone" dataKey="resolved" stroke={usdColors.teal} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
