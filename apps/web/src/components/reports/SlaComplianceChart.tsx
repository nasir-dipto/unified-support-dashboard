import type { SlaTrendPoint } from '@usd/shared-types';
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

export type SlaComplianceChartProps = {
  data: SlaTrendPoint[];
};

/**
 * Weekly SLA met vs breached (stacked bar).
 */
export function SlaComplianceChart(props: SlaComplianceChartProps): ReactElement {
  const { data } = props;
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">No SLA data for this period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="met" stackId="s" fill={usdColors.teal} />
        <Bar dataKey="breached" stackId="s" fill={usdColors.red} />
      </BarChart>
    </ResponsiveContainer>
  );
}
