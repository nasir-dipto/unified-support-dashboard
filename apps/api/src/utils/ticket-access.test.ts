import { describe, expect, it } from 'vitest';
import {
  canWriteMergedIncident,
  canWriteTicket,
  isTicketAssignedToUser,
} from './ticket-access.js';

describe('ticket-access', () => {
  const ticket = { assigneeId: 'Jane Agent' };

  it('matches assignee by email local part', () => {
    expect(isTicketAssignedToUser(ticket, 'jane.agent@usd.dev')).toBe(true);
  });

  it('manager can write any ticket', () => {
    expect(canWriteTicket(['manager'], { assigneeId: 'Other' }, 'm@usd.dev')).toBe(true);
  });

  it('technician cannot write unassigned ticket', () => {
    expect(
      canWriteTicket(['technician'], { assigneeId: 'Other Person' }, 'tech@usd.dev'),
    ).toBe(false);
  });

  it('technician can write assigned ticket', () => {
    expect(canWriteTicket(['technician'], ticket, 'jane.agent@usd.dev')).toBe(true);
  });

  it('technician can write merged incident when assigned to either ticket', () => {
    expect(
      canWriteMergedIncident(
        ['technician'],
        { assigneeId: 'Other' },
        { assigneeId: 'Nasir Dipto Personal' },
        'technician@usd.dev',
        'Nasir Dipto Personal',
      ),
    ).toBe(true);
  });

  it('matches assignee by DynamoDB displayName', () => {
    expect(
      isTicketAssignedToUser(
        { assigneeId: 'Nasir Dipto Personal' },
        'technician@usd.dev',
        'Nasir Dipto Personal',
      ),
    ).toBe(true);
    expect(
      canWriteTicket(
        ['technician'],
        { assigneeId: 'Nasir Dipto Personal' },
        'technician@usd.dev',
        'Nasir Dipto Personal',
      ),
    ).toBe(true);
  });
});
