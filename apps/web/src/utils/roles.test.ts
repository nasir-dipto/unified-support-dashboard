import { describe, expect, it } from 'vitest';
import { canAccessAdminPanel, getHomePathForRoles, getPrimaryViewRole } from './roles.js';

describe('roles', () => {
  it('maps admin to manager view', () => {
    expect(getPrimaryViewRole(['admin'])).toBe('manager');
    expect(getHomePathForRoles()).toBe('/tickets');
    expect(canAccessAdminPanel(['admin'])).toBe(true);
  });

  it('maps agent/viewer to technician', () => {
    expect(getPrimaryViewRole(['agent'])).toBe('technician');
    expect(getHomePathForRoles()).toBe('/tickets');
    expect(canAccessAdminPanel(['viewer'])).toBe(false);
  });
});
