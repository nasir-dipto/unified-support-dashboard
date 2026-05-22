import type { SupportRole } from '@usd/shared-types';

/**
 * Returns true when the user may access the admin panel.
 */
export function canAccessAdminPanel(roles: SupportRole[]): boolean {
  return roles.includes('super_admin');
}

/**
 * Returns true when the user may access the manager dashboard.
 */
export function canAccessManagerPanel(roles: SupportRole[]): boolean {
  return roles.includes('manager') || roles.includes('super_admin');
}

/**
 * Returns true when the user may manage KB drafts in admin (manager + super_admin).
 */
export function canManageKnowledgeBase(roles: SupportRole[]): boolean {
  return canAccessManagerPanel(roles);
}

/**
 * Returns true when the user may invite or mutate org users.
 */
export function canInviteUsers(roles: SupportRole[]): boolean {
  return roles.includes('super_admin');
}

/**
 * Returns true when the user may list org users.
 */
export function canListUsers(roles: SupportRole[]): boolean {
  return canAccessManagerPanel(roles);
}

/**
 * Returns true when the KB browse tab should be visible (all authenticated roles).
 */
export function canAccessKbNav(): boolean {
  return true;
}

/**
 * Default home path after login.
 */
export function getHomePathForRoles(): string {
  return '/tickets';
}

/**
 * Human-readable label for a support role.
 */
export function roleLabel(role: SupportRole): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'manager':
      return 'Manager';
    case 'technician':
      return 'Technician';
    default:
      return role;
  }
}

/**
 * Primary role for display (highest privilege wins).
 */
export function getPrimaryRole(roles: SupportRole[]): SupportRole {
  if (roles.includes('super_admin')) {
    return 'super_admin';
  }
  if (roles.includes('manager')) {
    return 'manager';
  }
  return 'technician';
}
