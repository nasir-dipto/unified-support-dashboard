import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';
import { useUsdWebSocket } from '../../hooks/useWebSocket';
import { AppHeader } from './AppHeader';

/**
 * Primary app chrome: sticky header + routed content area.
 */
export function AppShell(): ReactElement {
  useUsdWebSocket();

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-5 py-4">
        <Outlet />
      </main>
    </div>
  );
}
