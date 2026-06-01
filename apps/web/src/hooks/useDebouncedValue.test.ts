import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  it('updates after delay', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'a', delay: 50 } },
    );
    expect(result.current).toBe('a');
    rerender({ value: 'b', delay: 50 });
    expect(result.current).toBe('a');
    await waitFor(() => {
      expect(result.current).toBe('b');
    });
  });
});
