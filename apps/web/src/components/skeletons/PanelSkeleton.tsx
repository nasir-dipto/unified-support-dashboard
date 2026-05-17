import type { ReactElement } from 'react';

export type PanelSkeletonProps = {
  title?: string;
  lines?: number;
};

/**
 * Placeholder panel for charts/tables not yet backed by API data.
 */
export function PanelSkeleton(props: PanelSkeletonProps): ReactElement {
  const { title = 'Loading', lines = 4 } = props;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5" aria-busy="true">
      <h3 className="mb-4 text-sm font-bold text-gray-700">{title}</h3>
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-gray-100"
            style={{ width: `${String(90 - i * 12)}%` }}
          />
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-400">Data will appear when this feature is available.</p>
    </div>
  );
}
