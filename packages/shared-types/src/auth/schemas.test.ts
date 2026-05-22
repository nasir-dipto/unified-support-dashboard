import { describe, expect, it } from 'vitest';
import {
  acceptInviteRequestSchema,
  supportRoleSchema,
} from './schemas.js';

describe('auth schemas', () => {
  it('accepts phase 9 roles', () => {
    expect(supportRoleSchema.parse('technician')).toBe('technician');
    expect(supportRoleSchema.parse('manager')).toBe('manager');
    expect(supportRoleSchema.parse('super_admin')).toBe('super_admin');
  });

  it('rejects legacy roles', () => {
    expect(supportRoleSchema.safeParse('admin').success).toBe(false);
    expect(supportRoleSchema.safeParse('viewer').success).toBe(false);
  });

  it('parses accept invite request', () => {
    const parsed = acceptInviteRequestSchema.parse({
      token: 'tok',
      password: 'Password1!',
      orgId: 'demo-org',
    });
    expect(parsed.orgId).toBe('demo-org');
  });
});
