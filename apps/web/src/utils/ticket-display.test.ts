import { describe, expect, it } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import {
  estimateSlaPercentRemaining,
  formatAssignee,
  formatStatusLabel,
  isTicketAssignedToCurrentUser,
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

const user = {
  userId: '01USER',
  orgId: 'demo-org',
  email: 'admin@usd.dev',
  roles: ['super_admin' as const],
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

  it('returns null SLA when due date is absent', () => {
    expect(estimateSlaPercentRemaining(base.createdAt, base.updatedAt)).toBeNull();
  });

  it('computes SLA percent when due date is provided', () => {
    const p = estimateSlaPercentRemaining(base.createdAt, base.updatedAt, {
      dueAt: '2026-03-08T00:00:00.000Z',
      nowMs: Date.parse('2026-03-02T00:00:00.000Z'),
    });
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(100);
  });

  it('matches assignee by email', () => {
    expect(
      isTicketAssignedToCurrentUser({ ...base, assigneeId: 'admin@usd.dev' }, user),
    ).toBe(true);
  });

  it('does not match unrelated assignee', () => {
    expect(isTicketAssignedToCurrentUser({ ...base, assigneeId: 'Jane Agent' }, user)).toBe(
      false,
    );
  });
});
