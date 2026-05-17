import type { ReactElement } from 'react';
import { PanelSkeleton } from '../../components/skeletons/PanelSkeleton';

/**
 * Team performance table — skeleton until team metrics API exists.
 */
export function ManagerTeamTab(): ReactElement {
  return <PanelSkeleton title="Team performance" lines={10} />;
}
