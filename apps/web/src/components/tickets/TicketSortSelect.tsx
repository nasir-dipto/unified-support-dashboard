import type { TicketListSort } from '@usd/shared-types';
import type { ReactElement } from 'react';

const SORT_OPTIONS: { value: TicketListSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'priority', label: 'Priority (high→low)' },
  { value: 'status', label: 'Status' },
];

export type TicketSortSelectProps = {
  value: TicketListSort;
  onChange: (sort: TicketListSort) => void;
};

/**
 * Sort dropdown for the ticket queue.
 */
export function TicketSortSelect(props: TicketSortSelectProps): ReactElement {
  const { value, onChange } = props;

  return (
    <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sort</span>
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value as TicketListSort); }}
        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[12px] outline-none focus:border-usd-indigo"
        aria-label="Sort tickets"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
