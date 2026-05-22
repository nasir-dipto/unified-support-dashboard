import { describe, expect, it } from 'vitest';
import {
  canAccessAdminPanel,
  canAccessManagerPanel,
  canInviteUsers,
  getPrimaryRole,
  isTechnicianOnly,
  roleLabel,
} from './roles.js';

describe('roles utils', () => {
  it('super_admin is primary and can access admin', () => {
    expect(getPrimaryRole(['super_admin'])).toBe('super_admin');
    expect(canAccessAdminPanel(['super_admin'])).toBe(true);
    expect(canAccessManagerPanel(['super_admin'])).toBe(true);
  });

  it('manager can access manager panel not admin', () => {
    expect(getPrimaryRole(['manager'])).toBe('manager');
    expect(canAccessManagerPanel(['manager'])).toBe(true);
    expect(canAccessAdminPanel(['manager'])).toBe(false);
  });

  it('technician has limited access', () => {
    expect(getPrimaryRole(['technician'])).toBe('technician');
    expect(canAccessAdminPanel(['technician'])).toBe(false);
    expect(canInviteUsers(['technician'])).toBe(false);
    expect(isTechnicianOnly(['technician'])).toBe(true);
    expect(isTechnicianOnly(['manager'])).toBe(false);
  });

  it('roleLabel formats names', () => {
    expect(roleLabel('super_admin')).toBe('Super Admin');
  });
});
