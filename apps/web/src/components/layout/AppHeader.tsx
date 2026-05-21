import { usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { canAccessAdminPanel } from '../../utils/roles';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  agent: 'Technician',
  viewer: 'Technician',
};

/**
 * Sticky top header matching design reference.
 */
export function AppHeader(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const primaryRole = user?.roles[0] ?? 'viewer';
  const initials =
    user?.email !== undefined
      ? user.email.slice(0, 2).toUpperCase()
      : 'US';
  const showAdmin = user !== null && canAccessAdminPanel(user.roles);

  return (
    <header className="sticky top-0 z-[200] flex h-[52px] items-center border-b border-gray-200 bg-white px-5">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold text-white"
          style={{ backgroundColor: usdColors.indigo }}
        >
          US
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-wide text-gray-900">UNIFIED SUPPORT</div>
          <div className="text-[11px] text-gray-400">
            Welcome
            {user?.email !== undefined
              ? `, ${user.email.split('@')[0] ?? 'user'}`
              : ''}
          </div>
        </div>
      </div>

      <nav className="ml-8 flex items-center gap-4 text-sm font-semibold">
        <NavLink
          to="/tickets"
          className={({ isActive }) =>
            isActive ? 'text-usd-indigo' : 'text-gray-500 hover:text-gray-800'
          }
        >
          Tickets
        </NavLink>
        {primaryRole === 'admin' ? (
          <NavLink
            to="/manager"
            className={({ isActive }) =>
              isActive ? 'text-usd-indigo' : 'text-gray-500 hover:text-gray-800'
            }
          >
            Manager
          </NavLink>
        ) : null}
        {showAdmin ? (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              isActive ? 'text-usd-indigo' : 'text-gray-500 hover:text-gray-800'
            }
          >
            Admin
          </NavLink>
        ) : null}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[11px] font-extrabold text-white"
            style={{ backgroundColor: usdColors.blue }}
          >
            {initials}
          </div>
          <div>
            <div className="text-[13px] font-bold text-gray-900">{user?.email ?? 'User'}</div>
            <div className="text-[11px] text-gray-400">{roleLabels[primaryRole] ?? primaryRole}</div>
          </div>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <button
          type="button"
          onClick={() => {
            clear();
          }}
          className="rounded-md border border-red-200 px-3 py-1 text-[13px] font-bold text-usd-red"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
