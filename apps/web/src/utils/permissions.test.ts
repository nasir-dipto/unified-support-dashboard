import { describe, expect, it } from 'vitest';
import { canWriteTicket } from './permissions.js';

describe('permissions', () => {
  it('technician cannot write unassigned ticket', () => {
    expect(
      canWriteTicket(['technician'], { assigneeId: 'Other' }, 'tech@usd.dev'),
    ).toBe(false);
  });

  it('manager can write any ticket', () => {
    expect(canWriteTicket(['manager'], { assigneeId: 'X' }, 'm@usd.dev')).toBe(true);
  });
});
