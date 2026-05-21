import type { VolumeTrendPoint } from '@usd/shared-types';
import { usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type VolumeTrendChartProps = {
  data: VolumeTrendPoint[];
};

/**
 * Daily ticket volume by source (stacked bar).
 */
export function VolumeTrendChart(props: VolumeTrendChartProps): ReactElement {
  const { data } = props;
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">No volume data for this period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="jira" stackId="a" fill={usdColors.indigo} />
        <Bar dataKey="helpdesk" stackId="a" fill={usdColors.teal} />
      </BarChart>
    </ResponsiveContainer>
  );
}
