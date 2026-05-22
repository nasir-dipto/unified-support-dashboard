import type { SupportRole } from '@usd/shared-types';

/**
 * Returns true when the principal has the technician role.
 */
export function isTechnician(roles: SupportRole[]): boolean {
  return roles.includes('technician');
}

/**
 * Returns true when the principal has the manager role.
 */
export function isManager(roles: SupportRole[]): boolean {
  return roles.includes('manager');
}

/**
 * Returns true when the principal has the super_admin role.
 */
export function isSuperAdmin(roles: SupportRole[]): boolean {
  return roles.includes('super_admin');
}

/**
 * Returns true when the user may access manager-only APIs and navigation.
 */
export function canAccessManagerFeatures(roles: SupportRole[]): boolean {
  return isManager(roles) || isSuperAdmin(roles);
}

/**
 * Returns true when the user may access admin-only APIs and navigation.
 */
export function canAccessAdminFeatures(roles: SupportRole[]): boolean {
  return isSuperAdmin(roles);
}

/**
 * Returns true when the inviter may assign the target role on invite.
 */
export function canInviteRole(inviterRoles: SupportRole[], targetRole: SupportRole): boolean {
  void targetRole;
  return isSuperAdmin(inviterRoles);
}

/**
 * Returns true when the user may mutate org users (invite, etc.).
 */
export function canMutateUsers(roles: SupportRole[]): boolean {
  return isSuperAdmin(roles);
}

/**
 * Returns true when the user may list org users (read-only for manager).
 */
export function canListUsers(roles: SupportRole[]): boolean {
  return canAccessManagerFeatures(roles);
}
