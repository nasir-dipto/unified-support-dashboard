import { describe, expect, it } from 'vitest';
import type { SupportUserRecord } from './users.js';

describe('users table types', () => {
  it('supports refresh metadata fields', () => {
    const u: SupportUserRecord = {
      orgId: 'o',
      userId: 'u',
      email: 'e@e.com',
      passwordHash: 'h',
      createdAt: 't',
      refreshJti: 'jti',
      refreshExp: 1,
    };
    expect(u.refreshJti).toBe('jti');
  });
});
