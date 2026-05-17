import type { ReactElement } from 'react';
import { EmptyStatePanel } from '../../components/skeletons/EmptyStatePanel';

/**
 * User management — skeleton until users API exists (Phase 9).
 */
export function AdminUsersTab(): ReactElement {
  return (
    <EmptyStatePanel
      title="User management coming in Phase 9"
      description="Invite, edit, and deactivate users when the admin users API is available."
    />
  );
}
