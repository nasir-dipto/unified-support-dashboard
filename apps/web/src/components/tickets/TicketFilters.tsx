import { Pill } from '@usd/ui';
import type { ReactElement } from 'react';

export type TicketViewTab = 'all' | 'mine' | 'jira' | 'me';
export type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

export type TicketFiltersProps = {
  tab: TicketViewTab;
  onTabChange: (tab: TicketViewTab) => void;
  priority: PriorityFilter;
  onPriorityChange: (p: PriorityFilter) => void;
  search: string;
  onSearchChange: (q: string) => void;
  counts: { all: number; mine: number; jira: number; me: number };
};

/**
 * View / priority pills and search for technician queue.
 */
export function TicketFilters(props: TicketFiltersProps): ReactElement {
  const {
    tab,
    onTabChange,
    priority,
    onPriorityChange,
    search,
    onSearchChange,
    counts,
  } = props;

  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">View</span>
        <Pill compact label="All" active={tab === 'all'} count={counts.all} onClick={() => { onTabChange('all'); }} />
        <Pill
          compact
          label="My tickets"
          active={tab === 'mine'}
          count={counts.mine}
          onClick={() => { onTabChange('mine'); }}
        />
        <Pill compact label="Jira" active={tab === 'jira'} count={counts.jira} onClick={() => { onTabChange('jira'); }} />
        <Pill compact label="ManageEngine" active={tab === 'me'} count={counts.me} onClick={() => { onTabChange('me'); }} />
        <div className="mx-0.5 h-5 w-px bg-gray-200" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Priority</span>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
          <Pill
            compact
            key={p}
            label={p === 'all' ? 'All' : p}
            active={priority === p}
            onClick={() => { onPriorityChange(p); }}
          />
        ))}
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => { onSearchChange(e.target.value); }}
          className="ml-auto w-36 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] outline-none focus:border-usd-indigo"
        />
      </div>
    </div>
  );
}
