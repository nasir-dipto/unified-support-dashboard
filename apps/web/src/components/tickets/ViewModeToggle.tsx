import type { TicketViewMode } from '../../hooks/useViewMode';
import { LayoutGrid, List } from 'lucide-react';
import type { ReactElement } from 'react';

export type ViewModeToggleProps = {
  value: TicketViewMode;
  onChange: (mode: TicketViewMode) => void;
};

/**
 * Segmented list/grid control for the technician ticket queue.
 */
export function ViewModeToggle(props: ViewModeToggleProps): ReactElement {
  const { value, onChange } = props;

  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-gray-50"
      role="group"
      aria-label="Ticket view mode"
    >
      <button
        type="button"
        aria-pressed={value === 'list'}
        onClick={() => { onChange('list'); }}
        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold transition-colors ${
          value === 'list'
            ? 'bg-usd-indigo text-white'
            : 'text-gray-600 hover:bg-white'
        }`}
      >
        <List className="h-3.5 w-3.5" aria-hidden />
        List
      </button>
      <button
        type="button"
        aria-pressed={value === 'grid'}
        onClick={() => { onChange('grid'); }}
        className={`flex items-center gap-1 border-l border-gray-200 px-2 py-1 text-[11px] font-bold transition-colors ${
          value === 'grid'
            ? 'bg-usd-indigo text-white'
            : 'text-gray-600 hover:bg-white'
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
        Grid
      </button>
    </div>
  );
}
