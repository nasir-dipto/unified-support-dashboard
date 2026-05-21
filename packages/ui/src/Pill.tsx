import type { ReactElement } from 'react';

export type PillProps = {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  /** Smaller padding for dense filter bars */
  compact?: boolean;
};

/**
 * Filter chip button with optional count badge.
 */
export function Pill(props: PillProps): ReactElement {
  const { label, active = false, count, onClick, compact = false } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center whitespace-nowrap rounded-full font-medium ${
        compact ? 'gap-1 px-2.5 py-1 text-[12px]' : 'gap-1.5 px-3.5 py-1.5 text-[13px]'
      } ${
        active
          ? 'bg-gray-900 font-bold text-white'
          : 'border border-gray-200 bg-white text-gray-700'
      }`}
    >
      {label}
      {count !== undefined ? (
        <span
          className={`rounded-full font-bold ${
            compact ? 'px-1 text-[10px]' : 'px-1.5 text-[11px]'
          } ${
            active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
