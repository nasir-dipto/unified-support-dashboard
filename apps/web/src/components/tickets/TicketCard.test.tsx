import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  it('renders source, priority, status, id, and summary', () => {
    render(<TicketCard ticket={sample} />);
    expect(screen.getByTestId('ticket-source')).toHaveTextContent('Jira');
    expect(screen.getByTestId('ticket-priority')).toHaveTextContent('high');
    expect(screen.getByTestId('ticket-status')).toHaveTextContent('in_progress');
    expect(screen.getByTestId('ticket-id')).toHaveTextContent('DEMO-1');
    expect(screen.getByTestId('ticket-id')).toHaveTextContent('jira_DEMO-1');
    expect(screen.getByTestId('ticket-summary')).toHaveTextContent('Fix login bug');
  });
});
