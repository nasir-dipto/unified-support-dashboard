import { describe, expect, it } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import {
  estimateSlaPercentRemaining,
  formatAssignee,
  formatStatusLabel,
  sourceAccentColor,
} from './ticket-display.js';

const base: TicketApiDto = {
  ticketId: 'jira_ABC-1',
  orgId: 'demo-org',
  source: 'jira',
  externalId: 'ABC-1',
  summary: 'Test',
  priority: 'high',
  status: 'in_progress',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T12:00:00.000Z',
};

describe('ticket-display', () => {
  it('formats status with spaces', () => {
    expect(formatStatusLabel('in_progress')).toBe('in progress');
  });

  it('returns unassigned when empty', () => {
    expect(formatAssignee(undefined)).toBe('Unassigned');
  });

  it('source accent is blue for jira', () => {
    expect(sourceAccentColor('jira')).toBe('#2563EB');
  });

  it('sla percent is between 0 and 100', () => {
    const p = estimateSlaPercentRemaining(base.createdAt, base.updatedAt, Date.parse('2026-03-02T00:00:00.000Z'));
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });
});
