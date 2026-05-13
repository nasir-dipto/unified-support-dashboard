import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

/**
 * Ensures a session exists before rendering nested routes.
 */
export function AuthGuard(): ReactElement {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken === null || accessToken.length === 0) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
