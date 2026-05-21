import type { ReactElement } from 'react';
import { usdColors } from './tokens/colors.js';

export type SlaBarProps = {
  /** SLA remaining percentage 0–100 */
  value: number;
  /** Smaller bar for dense list rows */
  compact?: boolean;
};

/**
 * Horizontal SLA health bar with teal / amber / red thresholds.
 */
export function SlaBar(props: SlaBarProps): ReactElement {
  const { value, compact = false } = props;
  const clamped = Math.max(0, Math.min(100, value));
  const barColor =
    clamped > 80 ? usdColors.teal : clamped > 50 ? usdColors.amber : usdColors.red;

  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-2'}`}>
      <div
        className={`flex-1 overflow-hidden rounded-sm bg-gray-200 ${compact ? 'h-[4px]' : 'h-[5px]'}`}
      >
        <div
          className="h-full rounded-sm"
          style={{ width: `${String(clamped)}%`, backgroundColor: barColor }}
        />
      </div>
      <span
        className={`text-right text-gray-500 ${compact ? 'min-w-[26px] text-[10px]' : 'min-w-[30px] text-[11px]'}`}
      >
        {clamped}%
      </span>
    </div>
  );
}
