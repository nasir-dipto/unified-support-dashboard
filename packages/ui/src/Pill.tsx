import type { ReactElement } from 'react';

export type PillProps = {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
};

/**
 * Filter chip button with optional count badge.
 */
export function Pill(props: PillProps): ReactElement {
  const { label, active = false, count, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ${
        active
          ? 'bg-gray-900 font-bold text-white'
          : 'border border-gray-200 bg-white font-medium text-gray-700'
      }`}
    >
      {label}
      {count !== undefined ? (
        <span
          className={`rounded-full px-1.5 text-[11px] font-bold ${
            active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
