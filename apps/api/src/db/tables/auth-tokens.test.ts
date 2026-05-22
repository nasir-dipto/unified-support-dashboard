import { describe, expect, it } from 'vitest';
import type { AuthTokenRecord } from './auth-tokens.js';

describe('auth-tokens types', () => {
  it('defines invite token shape', () => {
    const rec: AuthTokenRecord = {
      orgId: 'demo-org',
      tokenId: '01HZ',
      tokenType: 'invite',
      email: 'a@usd.dev',
      expiresAt: '2026-01-02T00:00:00.000Z',
      invitedRole: 'technician',
    };
    expect(rec.tokenType).toBe('invite');
  });
});
