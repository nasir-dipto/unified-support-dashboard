import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/errors.js';
import { requireRole } from './role.middleware.js';

describe('requireRole', () => {
  it('calls next with AppError when role missing', () => {
    const req = {
      auth: {
        userId: '1',
        orgId: 'o',
        email: 'e@e.com',
        roles: ['technician'],
      },
    } as unknown as Request;
    const next = vi.fn();
    requireRole('super_admin')(req, {} as Response, next);
    expect(next.mock.calls.length).toBe(1);
    const arg: unknown = next.mock.calls[0]?.[0];
    expect(arg).toBeInstanceOf(AppError);
    expect((arg as AppError).statusCode).toBe(403);
  });

  it('calls next with no args when role matches', () => {
    const req = {
      auth: {
        userId: '1',
        orgId: 'o',
        email: 'e@e.com',
        roles: ['super_admin'],
      },
    } as unknown as Request;
    const next = vi.fn();
    requireRole('super_admin')(req, {} as Response, next);
    expect(next.mock.calls).toEqual([[]]);
  });
});
