import { Pill } from '@usd/ui';
import type { TicketListSort } from '@usd/shared-types';
import type { ReactElement, ReactNode } from 'react';
import type { TicketViewMode } from '../../hooks/useViewMode';
import { ProjectFilter } from './ProjectFilter';
import { TicketSortSelect } from './TicketSortSelect';
import { ViewModeToggle } from './ViewModeToggle';

export type TicketViewTab = 'all' | 'mine' | 'jira' | 'me';
export type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
export type TicketBucketFilter = 'all' | 'open' | 'closed';

export type TicketFilterCounts = {
  all: number;
  mine: number;
  jira: number;
  me: number;
};

export type TicketBucketCounts = {
  all: number;
  open: number;
  closed: number;
};

export type TicketFiltersProps = {
  tab: TicketViewTab;
  onTabChange: (tab: TicketViewTab) => void;
  bucket: TicketBucketFilter;
  onBucketChange: (bucket: TicketBucketFilter) => void;
  priority: PriorityFilter;
  onPriorityChange: (p: PriorityFilter) => void;
  search: string;
  onSearchChange: (q: string) => void;
  project: string;
  onProjectChange: (project: string) => void;
  sort: TicketListSort;
  onSortChange: (sort: TicketListSort) => void;
  counts: TicketFilterCounts;
  bucketCounts: TicketBucketCounts;
  projectCounts: Record<string, number>;
  viewMode: TicketViewMode;
  onViewModeChange: (mode: TicketViewMode) => void;
};

type FilterGroupProps = {
  label: string;
  children: ReactNode;
};

/**
 * Labeled pill group for the ticket filter card.
 */
function FilterGroup(props: FilterGroupProps): ReactElement {
  const { label, children } = props;
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * View / bucket / priority pills, project + sort dropdowns, and search for technician queue.
 */
export function TicketFilters(props: TicketFiltersProps): ReactElement {
  const {
    tab,
    onTabChange,
    bucket,
    onBucketChange,
    priority,
    onPriorityChange,
    search,
    onSearchChange,
    project,
    onProjectChange,
    sort,
    onSortChange,
    counts,
    bucketCounts,
    projectCounts,
    viewMode,
    onViewModeChange,
  } = props;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:gap-5">
        <FilterGroup label="View">
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
        </FilterGroup>

        <FilterGroup label="Status">
          <Pill
            compact
            label="All"
            active={bucket === 'all'}
            count={bucketCounts.all}
            onClick={() => { onBucketChange('all'); }}
          />
          <Pill
            compact
            label="Open"
            active={bucket === 'open'}
            count={bucketCounts.open}
            onClick={() => { onBucketChange('open'); }}
          />
          <Pill
            compact
            label="Closed"
            active={bucket === 'closed'}
            count={bucketCounts.closed}
            onClick={() => { onBucketChange('closed'); }}
          />
        </FilterGroup>

        <FilterGroup label="Priority">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
            <Pill
              compact
              key={p}
              label={p === 'all' ? 'All' : p}
              active={priority === p}
              onClick={() => { onPriorityChange(p); }}
            />
          ))}
        </FilterGroup>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <ProjectFilter value={project} projects={projectCounts} onChange={onProjectChange} />
          <TicketSortSelect value={sort} onChange={onSortChange} />
        </div>
        <input
          type="search"
          placeholder="Search title or ID…"
          value={search}
          onChange={(e) => { onSearchChange(e.target.value); }}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[13px] outline-none focus:border-usd-indigo"
          aria-label="Search tickets"
        />
        <div className="shrink-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">List</p>
          <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
        </div>
      </div>
    </div>
  );
}
