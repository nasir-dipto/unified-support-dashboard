import type { ReactElement } from 'react';
import type { SupportRole } from '@usd/shared-types';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export type RoleGuardProps = {
  allow: SupportRole[];
  children: React.ReactNode;
};

/**
 * Restricts children to users who have at least one of the allowed roles.
 */
export function RoleGuard(props: RoleGuardProps): ReactElement {
  const { allow, children } = props;
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const ok = allow.some((r) => roles.includes(r));
  if (!ok) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}
