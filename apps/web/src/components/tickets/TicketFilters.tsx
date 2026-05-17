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
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">View</span>
        <Pill label="All" active={tab === 'all'} count={counts.all} onClick={() => { onTabChange('all'); }} />
        <Pill
          label="My tickets"
          active={tab === 'mine'}
          count={counts.mine}
          onClick={() => { onTabChange('mine'); }}
        />
        <Pill label="Jira" active={tab === 'jira'} count={counts.jira} onClick={() => { onTabChange('jira'); }} />
        <Pill label="ManageEngine" active={tab === 'me'} count={counts.me} onClick={() => { onTabChange('me'); }} />
        <div className="mx-1 h-6 w-px bg-gray-200" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Priority</span>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
          <Pill
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
          className="ml-auto w-40 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[13px] outline-none focus:border-usd-indigo"
        />
      </div>
    </div>
  );
}
