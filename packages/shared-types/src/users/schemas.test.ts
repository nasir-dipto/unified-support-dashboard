import { describe, expect, it } from 'vitest';
import {
  inviteUserRequestSchema,
  orgUserSchema,
  usersListResponseSchema,
} from './schemas.js';

describe('users schemas', () => {
  it('parses org user', () => {
    const parsed = orgUserSchema.parse({
      userId: '01HZ',
      email: 'tech@usd.dev',
      role: 'technician',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(parsed.role).toBe('technician');
  });

  it('parses invite request', () => {
    const parsed = inviteUserRequestSchema.parse({
      email: 'new@usd.dev',
      role: 'technician',
    });
    expect(parsed.email).toBe('new@usd.dev');
  });

  it('parses users list response', () => {
    const parsed = usersListResponseSchema.parse({ data: [], total: 0 });
    expect(parsed.total).toBe(0);
  });
});
