import { describe, expect, it } from 'vitest';
import { acceptInviteRequestSchema } from '@usd/shared-types';

describe('auth api schemas', () => {
  it('parses accept invite', () => {
    const p = acceptInviteRequestSchema.parse({
      token: 't',
      password: 'Password1!',
      orgId: 'demo-org',
    });
    expect(p.orgId).toBe('demo-org');
  });
});
