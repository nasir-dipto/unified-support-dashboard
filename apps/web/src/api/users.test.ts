import { describe, expect, it } from 'vitest';
import { inviteUserRequestSchema } from '@usd/shared-types';

describe('users api', () => {
  it('validates invite payload', () => {
    const parsed = inviteUserRequestSchema.parse({
      email: 'a@usd.dev',
      role: 'technician',
    });
    expect(parsed.role).toBe('technician');
  });
});
