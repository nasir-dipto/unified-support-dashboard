import { describe, expect, it } from 'vitest';
import { canInviteRole } from '../utils/role-helpers.js';

describe('users.service permissions', () => {
  it('super_admin can invite manager', () => {
    expect(canInviteRole(['super_admin'], 'manager')).toBe(true);
  });
});
