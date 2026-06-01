import { describe, expect, it } from 'vitest';
import { ticketsListQuerySchema } from '@usd/shared-types';

describe('ticketsListQuerySchema', () => {
  it('defaults page and limit', () => {
    const parsed = ticketsListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
    expect(parsed.sort).toBe('newest');
  });

  it('parses mine=true', () => {
    expect(ticketsListQuerySchema.parse({ mine: 'true' }).mine).toBe(true);
  });

  it('rejects page below 1', () => {
    expect(ticketsListQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });
});
