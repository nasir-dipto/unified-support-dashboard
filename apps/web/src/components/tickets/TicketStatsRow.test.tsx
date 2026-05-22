import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import { TicketStatsRow } from './TicketStatsRow';
import { useAuthStore } from '../../store/auth.store';

const tickets: TicketApiDto[] = [
  {
    ticketId: 'jira_A-1',
    orgId: 'demo-org',
    source: 'jira',
    externalId: 'A-1',
    summary: 'Jira one',
    priority: 'critical',
    status: 'open',
    createdAt: 't',
    updatedAt: 't',
  },
  {
    ticketId: 'hd_1',
    orgId: 'demo-org',
    source: 'helpdesk',
    externalId: '1',
    summary: 'HD one',
    priority: 'low',
    status: 'pending',
    createdAt: 't',
    updatedAt: 't',
  },
];

describe('TicketStatsRow', () => {
  afterEach(() => {
    useAuthStore.getState().clear();
  });

  it('counts open, critical, jira, and helpdesk from full ticket list', () => {
    useAuthStore.getState().setSession('a', 'r', {
      userId: '01USER',
      orgId: 'demo-org',
      email: 'admin@usd.dev',
      roles: ['super_admin'],
    });
    render(<TicketStatsRow tickets={tickets} />);
    expect(screen.getByText('Open').previousElementSibling?.textContent).toBe('2');
    expect(screen.getByText('Critical').previousElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Jira tickets').previousElementSibling?.textContent).toBe('1');
    expect(screen.getByText('ME tickets').previousElementSibling?.textContent).toBe('1');
  });

  it('shows My Tickets label for technician-only view', () => {
    useAuthStore.getState().setSession('a', 'r', {
      userId: '01TECH',
      orgId: 'demo-org',
      email: 'technician@usd.dev',
      roles: ['technician'],
      displayName: 'Nasir Dipto Personal',
    });
    render(<TicketStatsRow tickets={tickets} technicianOnly />);
    expect(screen.getByText('My Tickets')).toBeInTheDocument();
    useAuthStore.getState().clear();
  });
});
