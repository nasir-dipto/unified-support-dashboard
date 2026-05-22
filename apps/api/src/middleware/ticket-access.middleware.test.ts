import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import { AppError } from '../utils/errors.js';
import { requireTicketWriteAccess } from './ticket-access.middleware.js';

describe('requireTicketWriteAccess', () => {
  it('returns 403 when technician cannot write ticket', () => {
    const ticket: TicketApiDto = {
      ticketId: 'hd_1',
      orgId: 'demo-org',
      source: 'helpdesk',
      externalId: 'HD-1',
      summary: 'Test',
      priority: 'medium',
      status: 'open',
      assigneeId: 'Someone Else',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const req = {
      auth: {
        userId: 'u1',
        orgId: 'demo-org',
        email: 'tech@usd.dev',
        roles: ['technician'],
      },
      ticket,
    } as unknown as Request;
    const next = vi.fn();
    requireTicketWriteAccess()(req, {} as Response, next);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError);
  });
});
