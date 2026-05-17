import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import { TicketCard } from './TicketCard';

const sample: TicketApiDto = {
  ticketId: 'jira_DEMO-1',
  orgId: 'o1',
  source: 'jira',
  externalId: 'DEMO-1',
  summary: 'Fix login bug',
  description: undefined,
  priority: 'high',
  status: 'in_progress',
  assigneeId: undefined,
  reporterId: undefined,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TicketCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders summary, source, priority, and external id', () => {
    render(<TicketCard ticket={sample} />);
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Jira')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('DEMO-1')).toBeInTheDocument();
  });

  it('renders Helpdesk source', () => {
    const hd: TicketApiDto = {
      ...sample,
      ticketId: 'hd_1',
      source: 'helpdesk',
      externalId: '1',
      status: 'pending',
    };
    render(<TicketCard ticket={hd} />);
    expect(screen.getByText('ManageEngine')).toBeInTheDocument();
  });
});
