import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportTicketRecord } from '@usd/shared-types';
import { loadServerEnv, resetServerEnvForTests } from '../../config/loadEnv.js';
import * as dynamo from '../dynamo.client.js';
import {
  isStaleTicketUpsert,
  mergeTicketUpsertFields,
  staleUpsertNeedsWrite,
  upsertTicket,
} from './tickets.js';

function baseTicket(overrides: Partial<SupportTicketRecord> = {}): SupportTicketRecord {
  return {
    ticketId: 'hd_1',
    orgId: 'demo-org',
    source: 'helpdesk',
    externalId: '1',
    summary: 'Test ticket',
    priority: 'medium',
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('upsertTicket updatedAt guard', () => {
  const send = vi.fn();

  beforeEach(() => {
    resetServerEnvForTests();
    process.env.SUPPORT_TICKETS_TABLE = 'support_tickets';
    loadServerEnv();
    send.mockReset();
    vi.spyOn(dynamo, 'getDocumentClient').mockReturnValue({ send } as never);
  });

  it('newer incoming updatedAt wins and writes', async () => {
    const prev = baseTicket({
      summary: 'Stored',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    send.mockResolvedValueOnce({ Item: prev }).mockResolvedValueOnce({});
    const incoming = baseTicket({
      summary: 'Newer',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const result = await upsertTicket(incoming);
    expect(result.summary).toBe('Newer');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('older incoming updatedAt skips core field overwrite', async () => {
    const prev = baseTicket({
      summary: 'Stored',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    send.mockResolvedValueOnce({ Item: prev });
    const incoming = baseTicket({
      summary: 'Stale',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const result = await upsertTicket(incoming);
    expect(result.summary).toBe('Stored');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('same timestamp skips core field overwrite', async () => {
    const prev = baseTicket({
      summary: 'Stored',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    send.mockResolvedValueOnce({ Item: prev });
    const incoming = baseTicket({
      summary: 'Same time',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const result = await upsertTicket(incoming);
    expect(result.summary).toBe('Stored');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('no existing record always writes', async () => {
    send.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    const incoming = baseTicket({ summary: 'First write' });
    const result = await upsertTicket(incoming);
    expect(result.summary).toBe('First write');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('sentiment fields update even when ticket upsert is stale', async () => {
    const prev = baseTicket({
      summary: 'Stored',
      updatedAt: '2026-01-02T00:00:00.000Z',
      sentimentStale: false,
    });
    send.mockResolvedValueOnce({ Item: prev }).mockResolvedValueOnce({});
    const incoming = baseTicket({
      summary: 'Stale summary',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sentimentStale: true,
    });
    const result = await upsertTicket(incoming);
    expect(result.summary).toBe('Stored');
    expect(result.sentimentStale).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('ticket upsert merge helpers', () => {
  it('isStaleTicketUpsert detects older and equal timestamps', () => {
    const prev = baseTicket({ updatedAt: '2026-01-02T00:00:00.000Z' });
    expect(isStaleTicketUpsert(prev, '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(isStaleTicketUpsert(prev, '2026-01-02T00:00:00.000Z')).toBe(true);
    expect(isStaleTicketUpsert(prev, '2026-01-03T00:00:00.000Z')).toBe(false);
    expect(isStaleTicketUpsert(undefined, '2026-01-01T00:00:00.000Z')).toBe(false);
  });

  it('staleUpsertNeedsWrite is false when only core fields differ', () => {
    const prev = baseTicket({ summary: 'A', sentimentStale: false });
    const merged = mergeTicketUpsertFields(
      prev,
      baseTicket({ summary: 'B', updatedAt: '2026-01-01T00:00:00.000Z' }),
      true,
    );
    expect(staleUpsertNeedsWrite(prev, merged)).toBe(false);
  });
});
