import type { OrgUser } from '@usd/shared-types';
import type { ReactElement } from 'react';
import { roleLabel } from '../../utils/roles.js';

export type UsersTableProps = {
  users: OrgUser[];
};

/**
 * Table of org users and roles.
 */
export function UsersTable(props: UsersTableProps): ReactElement {
  const { users } = props;
  if (users.length === 0) {
    return <p className="text-sm text-gray-500">No users in this organization.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.userId} className="border-t border-gray-100">
              <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
              <td className="px-4 py-3 text-gray-600">{roleLabel(u.role)}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
