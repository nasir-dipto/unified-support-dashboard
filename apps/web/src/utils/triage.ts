import type { TicketApiDto } from '@usd/shared-types';

export type TriageInput = Pick<
  TicketApiDto,
  'priority' | 'status' | 'createdAt' | 'updatedAt'
> & {
  sentiment?: 'positive' | 'neutral' | 'negative';
  churnRisk?: boolean;
  escalated?: boolean;
  slaPercentRemaining?: number;
};

const PRIORITY_POINTS: Record<TicketApiDto['priority'], number> = {
  critical: 40,
  high: 30,
  medium: 15,
  low: 5,
};

/**
 * Client-side triage score 0–100 per CLAUDE.md formula.
 */
export function computeTriageScore(input: TriageInput): number {
  let score = PRIORITY_POINTS[input.priority];

  const sla = input.slaPercentRemaining;
  if (sla !== undefined && sla < 25) {
    score += Math.round(((25 - sla) / 25) * 35);
  }

  if (input.sentiment === 'negative') {
    score += 15;
  }
  if (input.churnRisk === true) {
    score += 10;
  }
  if (input.escalated === true) {
    score += 10;
  }

  return Math.min(100, score);
}
