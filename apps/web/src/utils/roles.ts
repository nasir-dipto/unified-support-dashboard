import type { SupportRole } from '@usd/shared-types';

export type ViewRole = 'technician' | 'manager' | 'admin';

/**
 * Maps JWT support roles to the primary dashboard view.
 */
export function getPrimaryViewRole(roles: SupportRole[]): ViewRole {
  if (roles.includes('admin')) {
    return 'manager';
  }
  return 'technician';
}

/**
 * Returns true when the user may access the admin panel.
 */
export function canAccessAdminPanel(roles: SupportRole[]): boolean {
  return roles.includes('admin');
}

/**
 * Default home path after login and for `/` (always ticket queue).
 */
export function getHomePathForRoles(): string {
  return '/tickets';
}
