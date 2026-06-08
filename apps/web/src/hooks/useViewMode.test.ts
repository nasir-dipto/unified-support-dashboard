import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readTicketViewMode,
  TICKET_VIEW_MODE_STORAGE_KEY,
  useViewMode,
} from './useViewMode';

describe('useViewMode', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to list when storage is empty', () => {
    expect(readTicketViewMode()).toBe('list');
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('list');
  });

  it('reads grid from localStorage on init', () => {
    localStorage.setItem(TICKET_VIEW_MODE_STORAGE_KEY, 'grid');
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('grid');
  });

  it('persists mode to localStorage on change', () => {
    const { result } = renderHook(() => useViewMode());
    act(() => {
      result.current.setViewMode('grid');
    });
    expect(result.current.viewMode).toBe('grid');
    expect(localStorage.getItem(TICKET_VIEW_MODE_STORAGE_KEY)).toBe('grid');
  });

  it('falls back to list when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readTicketViewMode()).toBe('list');
  });

  it('updates in-memory mode when localStorage setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useViewMode());
    act(() => {
      result.current.setViewMode('grid');
    });
    expect(result.current.viewMode).toBe('grid');
  });
});
