import type { CustomerSentimentRow } from '@usd/shared-types';
import { usdColors, sentimentColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type BarShapePayload = {
  fill?: string;
};

type ColoredBarProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: BarShapePayload;
};

function ColoredBar(props: ColoredBarProps): ReactElement {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const fill = payload?.fill ?? usdColors.gray;
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} />;
}

export type CustomerSentimentChartProps = {
  rows: CustomerSentimentRow[];
};

/**
 * Per-customer average sentiment score (BarChart).
 */
export function CustomerSentimentChart(props: CustomerSentimentChartProps): ReactElement {
  const { rows } = props;
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">No customer data yet.</p>;
  }
  const data = rows.map((r) => ({
    name: r.customerLabel,
    score: r.avgScore,
    sentiment: r.sentiment,
    fill: sentimentColors[r.sentiment] ?? usdColors.gray,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="score" shape={ColoredBar} />
      </BarChart>
    </ResponsiveContainer>
  );
}
