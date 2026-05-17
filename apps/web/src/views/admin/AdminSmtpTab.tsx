import type { ReactElement } from 'react';
import { PanelSkeleton } from '../../components/skeletons/PanelSkeleton';

/**
 * SMTP configuration — skeleton until Phase 8 notifications API exists.
 */
export function AdminSmtpTab(): ReactElement {
  return <PanelSkeleton title="SMTP & notification rules" lines={8} />;
}
