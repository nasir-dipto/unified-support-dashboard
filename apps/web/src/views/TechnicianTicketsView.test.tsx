import { describe, expect, it } from 'vitest';
import type { AuthUserPublic } from '@usd/shared-types';
import { getDefaultTicketViewTab } from './TechnicianTicketsView.js';

const technician: AuthUserPublic = {
  userId: 't1',
  orgId: 'demo-org',
  email: 'technician@usd.dev',
  roles: ['technician'],
  displayName: 'Nasir Dipto Personal',
};

const manager: AuthUserPublic = {
  userId: 'm1',
  orgId: 'demo-org',
  email: 'manager@usd.dev',
  roles: ['manager'],
};

describe('getDefaultTicketViewTab', () => {
  it('defaults technicians to My Tickets', () => {
    expect(getDefaultTicketViewTab(technician)).toBe('mine');
  });

  it('defaults manager to All', () => {
    expect(getDefaultTicketViewTab(manager)).toBe('all');
  });

  it('defaults super_admin to All', () => {
    expect(
      getDefaultTicketViewTab({
        ...manager,
        email: 'admin@usd.dev',
        roles: ['super_admin'],
      }),
    ).toBe('all');
  });
});
