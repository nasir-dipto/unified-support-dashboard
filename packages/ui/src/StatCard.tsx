import type { ReactElement, ReactNode } from 'react';

export type StatCardProps = {
  label: string;
  value: ReactNode;
  color: string;
  sub?: string;
};

/**
 * Metric tile with coloured top accent border.
 */
export function StatCard(props: StatCardProps): ReactElement {
  const { label, value, color, sub } = props;
  return (
    <div
      className="min-w-0 rounded-[10px] border border-gray-200 bg-white px-4 py-3.5"
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <div className="text-2xl font-extrabold" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </div>
      {sub !== undefined ? <div className="mt-1 text-[11px] text-gray-400">{sub}</div> : null}
    </div>
  );
}
