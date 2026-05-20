import type { SentimentCount } from '@usd/shared-types';
import { usdColors } from '@usd/ui';
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

/**
 * Renders a bar segment using the fill color from the data row.
 */
function ColoredBar(props: ColoredBarProps): ReactElement {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const fill = payload?.fill ?? usdColors.gray;
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} />;
}

export type TicketsBySentimentChartProps = {
  counts: SentimentCount;
};

const COLORS: Record<string, string> = {
  positive: usdColors.teal,
  neutral: usdColors.amber,
  negative: usdColors.red,
  unanalyzed: usdColors.gray,
};

/**
 * Bar chart of ticket counts by sentiment label.
 */
export function TicketsBySentimentChart(props: TicketsBySentimentChartProps): ReactElement {
  const { counts } = props;
  const data = [
    { name: 'Positive', key: 'positive', value: counts.positive, fill: COLORS.positive },
    { name: 'Neutral', key: 'neutral', value: counts.neutral, fill: COLORS.neutral },
    { name: 'Negative', key: 'negative', value: counts.negative, fill: COLORS.negative },
    { name: 'Pending', key: 'unanalyzed', value: counts.unanalyzed, fill: COLORS.unanalyzed },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" shape={ColoredBar} />
      </BarChart>
    </ResponsiveContainer>
  );
}
