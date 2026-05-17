import type { ReactElement } from 'react';
import { EmptyStatePanel } from '../../components/skeletons/EmptyStatePanel';

/**
 * AI insights cards — empty until insights API exists.
 */
export function ManagerInsightsTab(): ReactElement {
  return (
    <EmptyStatePanel
      title="No AI insights yet"
      description="Proactive insights will appear here when the insights service is enabled in a future phase."
    />
  );
}
