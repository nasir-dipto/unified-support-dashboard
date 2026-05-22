import { describe, expect, it } from 'vitest';
import {
  canAccessAdminFeatures,
  canAccessManagerFeatures,
  canInviteRole,
  canListUsers,
  canMutateUsers,
} from './role-helpers.js';

describe('role-helpers', () => {
  it('manager can access manager features but not admin', () => {
    expect(canAccessManagerFeatures(['manager'])).toBe(true);
    expect(canAccessAdminFeatures(['manager'])).toBe(false);
  });

  it('super_admin can access admin features', () => {
    expect(canAccessAdminFeatures(['super_admin'])).toBe(true);
  });

  it('only super_admin can invite and mutate users', () => {
    expect(canInviteRole(['super_admin'], 'technician')).toBe(true);
    expect(canInviteRole(['manager'], 'technician')).toBe(false);
    expect(canMutateUsers(['manager'])).toBe(false);
    expect(canMutateUsers(['super_admin'])).toBe(true);
  });

  it('manager can list users', () => {
    expect(canListUsers(['manager'])).toBe(true);
    expect(canListUsers(['technician'])).toBe(false);
  });
});
