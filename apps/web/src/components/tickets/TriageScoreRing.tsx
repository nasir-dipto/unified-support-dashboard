import type { ReactElement } from 'react';
import { usdColors } from '@usd/ui';

export type TriageScoreRingProps = {
  score: number;
  size?: number;
};

/**
 * Circular triage score indicator (0–100).
 */
export function TriageScoreRing(props: TriageScoreRingProps): ReactElement {
  const { score, size = 36 } = props;
  const color =
    score >= 75 ? usdColors.red : score >= 50 ? usdColors.coral : usdColors.teal;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-extrabold"
      style={{ width: size, height: size, borderColor: color, color }}
      title={`Triage score ${String(score)}`}
    >
      {score}
    </div>
  );
}
