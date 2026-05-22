import type { OrgUser, SupportRole } from '@usd/shared-types';
import { listRolesByOrg } from '../db/tables/roles.js';
import { listUsersByOrg } from '../db/tables/users.js';
import { canInviteRole } from '../utils/role-helpers.js';
import { AppError } from '../utils/errors.js';
import { sendUserInvite } from './password-reset.service.js';

/**
 * Lists org users with their assigned roles.
 */
export async function listOrgUsers(orgId: string): Promise<OrgUser[]> {
  const [users, roles] = await Promise.all([
    listUsersByOrg(orgId),
    listRolesByOrg(orgId),
  ]);
  const roleByUser = new Map(roles.map((r) => [r.userId, r.role]));
  return users.map((u) => ({
    userId: u.userId,
    email: u.email,
    role: roleByUser.get(u.userId) ?? 'technician',
    createdAt: u.createdAt,
  }));
}

/**
 * Invites a user when the inviter has permission for the target role.
 */
export async function inviteOrgUser(params: {
  orgId: string;
  inviterRoles: SupportRole[];
  inviterUserId: string;
  email: string;
  role: SupportRole;
}): Promise<void> {
  if (!canInviteRole(params.inviterRoles, params.role)) {
    throw new AppError('Forbidden', 'FORBIDDEN', 403);
  }
  await sendUserInvite({
    orgId: params.orgId,
    email: params.email,
    role: params.role,
    createdByUserId: params.inviterUserId,
  });
}
