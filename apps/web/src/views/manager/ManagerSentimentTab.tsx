import type { ReactElement } from 'react';
import { PanelSkeleton } from '../../components/skeletons/PanelSkeleton';
import { EmptyStatePanel } from '../../components/skeletons/EmptyStatePanel';
import { StatCard, usdColors } from '@usd/ui';

/**
 * Sentiment analysis layout — skeleton until Phase 6 API exists.
 */
export function ManagerSentimentTab(): ReactElement {
  const hdTickets = 0;
  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        Sentiment analysis applies to ManageEngine tickets. Data will load when Phase 6 is available.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Negative" value="—" color={usdColors.red} sub="ME tickets" />
        <StatCard label="Neutral" value="—" color={usdColors.amber} sub="ME tickets" />
        <StatCard label="Positive" value="—" color={usdColors.teal} sub="ME tickets" />
        <StatCard
          label="At-risk enterprise"
          value="—"
          color={usdColors.coral}
          sub={`${String(hdTickets)} helpdesk tickets`}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelSkeleton title="Trend — 7 weeks" lines={6} />
        <EmptyStatePanel title="AI briefing" description="Generate sentiment briefing when API is ready." />
      </div>
      <div className="mt-4">
        <PanelSkeleton title="Per-customer breakdown" lines={8} />
      </div>
    </div>
  );
}
