import { describe, expect, it } from 'vitest';
import { defaultSlaPolicy } from '@usd/shared-types';
import type { SupportTicketRecord } from '@usd/shared-types';
import {
  computeSlaDueAtFromPolicy,
  estimateSlaPercentRemaining,
  isSlaBreachRisk,
  resolveSlaDueAt,
  toTicketApiDto,
} from './sla.js';

const baseTicket: SupportTicketRecord = {
  ticketId: 'hd_1',
  orgId: 'demo-org',
  source: 'helpdesk',
  externalId: '1',
  summary: 'Test',
  priority: 'high',
  status: 'open',
  createdAt: '2026-05-01T12:00:00.000Z',
  updatedAt: '2026-05-01T12:00:00.000Z',
};

describe('sla utils', () => {
  it('computeSlaDueAtFromPolicy adds hours by priority', () => {
    const due = computeSlaDueAtFromPolicy(baseTicket.createdAt, 'high', defaultSlaPolicy);
    expect(new Date(due).getTime()).toBe(
      new Date('2026-05-01T16:00:00.000Z').getTime(),
    );
  });

  it('resolveSlaDueAt prefers explicit field', () => {
    const due = resolveSlaDueAt({
      ...baseTicket,
      slaDueAt: '2026-05-10T00:00:00.000Z',
    });
    expect(due).toBe('2026-05-10T00:00:00.000Z');
  });

  it('isSlaBreachRisk when under 25% remaining', () => {
    const created = '2026-05-01T00:00:00.000Z';
    const due = '2026-05-01T04:00:00.000Z';
    const now = new Date('2026-05-01T03:30:00.000Z').getTime();
    const pct = estimateSlaPercentRemaining(created, due, now);
    expect(pct).toBeLessThan(25);
    expect(
      isSlaBreachRisk(
        { ...baseTicket, createdAt: created, slaDueAt: due },
        defaultSlaPolicy,
        now,
      ),
    ).toBe(true);
  });

  it('toTicketApiDto includes slaDueAt', () => {
    const dto = toTicketApiDto(baseTicket, defaultSlaPolicy);
    expect(dto.slaDueAt).toBeDefined();
  });
});
