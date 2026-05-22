import type { ReactElement } from 'react';
import { InviteUserForm } from '../../components/users/InviteUserForm.js';
import { UsersTable } from '../../components/users/UsersTable.js';
import { useUsers } from '../../hooks/useUsers.js';
import { useAuthStore } from '../../store/auth.store';
import { canInviteUsers } from '../../utils/roles.js';

/**
 * User management — list users; super_admin can invite.
 */
export function AdminUsersTab(): ReactElement {
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const usersQuery = useUsers();
  const showInvite = canInviteUsers(roles);

  return (
    <div className="space-y-6">
      {showInvite ? <InviteUserForm /> : null}
      <div>
        <h3 className="mb-3 text-sm font-bold text-gray-900">Organization users</h3>
        {usersQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading users…</p>
        ) : (
          <UsersTable users={usersQuery.data?.data ?? []} />
        )}
      </div>
    </div>
  );
}
