import type { ReactElement } from 'react';
import { usdColors } from './tokens/colors.js';

export type SlaBarProps = {
  /** SLA remaining percentage 0–100 */
  value: number;
};

/**
 * Horizontal SLA health bar with teal / amber / red thresholds.
 */
export function SlaBar(props: SlaBarProps): ReactElement {
  const { value } = props;
  const clamped = Math.max(0, Math.min(100, value));
  const barColor =
    clamped > 80 ? usdColors.teal : clamped > 50 ? usdColors.amber : usdColors.red;

  return (
    <div className="flex items-center gap-2">
      <div className="h-[5px] flex-1 overflow-hidden rounded-sm bg-gray-200">
        <div
          className="h-full rounded-sm"
          style={{ width: `${String(clamped)}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="min-w-[30px] text-right text-[11px] text-gray-500">{clamped}%</span>
    </div>
  );
}
