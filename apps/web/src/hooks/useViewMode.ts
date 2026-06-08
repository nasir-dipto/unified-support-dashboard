import { useCallback, useState } from 'react';

/** Persisted ticket queue presentation mode. */
export type TicketViewMode = 'list' | 'grid';

export const TICKET_VIEW_MODE_STORAGE_KEY = 'usd:ticketViewMode';

/**
 * Reads view mode from localStorage; defaults to list when missing or unavailable.
 */
export function readTicketViewMode(): TicketViewMode {
  try {
    const stored = localStorage.getItem(TICKET_VIEW_MODE_STORAGE_KEY);
    if (stored === 'grid' || stored === 'list') {
      return stored;
    }
  } catch {
    return 'list';
  }
  return 'list';
}

/**
 * Persists ticket queue view mode (`list` | `grid`) in localStorage.
 */
export function useViewMode(): {
  viewMode: TicketViewMode;
  setViewMode: (mode: TicketViewMode) => void;
} {
  const [viewMode, setViewModeState] = useState<TicketViewMode>(readTicketViewMode);

  const setViewMode = useCallback((mode: TicketViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(TICKET_VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* private mode / SSR — in-memory only */
    }
  }, []);

  return { viewMode, setViewMode };
}
