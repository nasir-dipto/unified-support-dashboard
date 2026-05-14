import type { ReactElement } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

/**
 * Primary app chrome: sidebar + header with routed content area.
 */
export function AppShell(): ReactElement {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
        <div className="text-sm font-semibold tracking-tight text-slate-800">
          Unified Support
        </div>
        <nav className="mt-4 flex flex-col gap-1 text-sm">
          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `rounded px-2 py-1.5 ${isActive ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`
            }
          >
            Tickets
          </NavLink>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-lg font-medium text-slate-800">Dashboard</h1>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
