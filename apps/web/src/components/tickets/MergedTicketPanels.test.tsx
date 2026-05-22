import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import { MergedTicketPanels } from './MergedTicketPanels.js';

const jira: TicketApiDto = {
  ticketId: 'jira_1',
  orgId: 'o',
  source: 'jira',
  externalId: 'JIRA-1',
  summary: 'Jira summary',
  priority: 'high',
  status: 'open',
  createdAt: 't',
  updatedAt: 't',
  assigneeId: 'dev',
};

const hd: TicketApiDto = {
  ticketId: 'hd_1',
  orgId: 'o',
  source: 'helpdesk',
  externalId: '1',
  summary: 'HD summary',
  priority: 'medium',
  status: 'in_progress',
  createdAt: 't',
  updatedAt: 't',
  customerEmail: 'cust@example.com',
};

describe('MergedTicketPanels', () => {
  it('renders Jira and ManageEngine panels', () => {
    render(<MergedTicketPanels pair={{ jira, hd }} />);
    expect(screen.getByText('Jira summary')).toBeInTheDocument();
    expect(screen.getByText('HD summary')).toBeInTheDocument();
    expect(screen.getByText('ManageEngine')).toBeInTheDocument();
  });
});
