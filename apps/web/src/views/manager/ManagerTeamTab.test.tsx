import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import { ManagerTeamTab } from './ManagerTeamTab';

function ticket(
  overrides: Partial<TicketApiDto> & Pick<TicketApiDto, 'ticketId' | 'assigneeId'>,
): TicketApiDto {
  return {
    orgId: 'demo-org',
    source: 'jira',
    externalId: overrides.ticketId.replace('jira_', ''),
    summary: 'Test ticket',
    priority: 'medium',
    status: 'open',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ManagerTeamTab', () => {
  it('shows message when no tickets have assignees', () => {
    render(
      <ManagerTeamTab
        tickets={[
          ticket({ ticketId: 'jira_1', assigneeId: '' }),
          ticket({ ticketId: 'jira_2', assigneeId: '  ' }),
        ]}
      />,
    );
    expect(screen.getByText('No team data available')).toBeInTheDocument();
  });

  it('renders technician rows with assigned, open, resolved, and avg priority', () => {
    render(
      <ManagerTeamTab
        tickets={[
          ticket({
            ticketId: 'jira_1',
            assigneeId: 'alice@usd.dev',
            status: 'open',
            priority: 'critical',
          }),
          ticket({
            ticketId: 'jira_2',
            assigneeId: 'alice@usd.dev',
            status: 'resolved',
            priority: 'high',
          }),
          ticket({
            ticketId: 'hd_3',
            source: 'helpdesk',
            externalId: '3',
            assigneeId: 'bob@usd.dev',
            status: 'in_progress',
            priority: 'low',
          }),
        ]}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Technician' })).toBeInTheDocument();
    expect(screen.getByText('alice@usd.dev')).toBeInTheDocument();
    expect(screen.getByText('bob@usd.dev')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});
