import type { ReactElement } from 'react';
import { PanelSkeleton } from '../../components/skeletons/PanelSkeleton';

/**
 * Jira / ManageEngine integration settings — skeleton (no settings API yet).
 */
export function AdminIntegrationsTab(): ReactElement {
  return (
    <div className="space-y-4">
      <PanelSkeleton title="Jira integration" lines={6} />
      <PanelSkeleton title="ManageEngine ServiceDesk Plus" lines={5} />
    </div>
  );
}
