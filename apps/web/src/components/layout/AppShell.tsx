import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';

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
        <p className="mt-2 text-xs text-slate-500">Navigation coming in later phases.</p>
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
