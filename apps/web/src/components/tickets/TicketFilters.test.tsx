import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketFilters } from './TicketFilters';

describe('TicketFilters', () => {
  it('fires tab and priority changes', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const onPriorityChange = vi.fn();
    render(
      <TicketFilters
        tab="all"
        onTabChange={onTabChange}
        priority="all"
        onPriorityChange={onPriorityChange}
        search=""
        onSearchChange={vi.fn()}
        project=""
        onProjectChange={vi.fn()}
        sort="newest"
        onSortChange={vi.fn()}
        counts={{ all: 10, mine: 2, jira: 7, me: 3 }}
        projectCounts={{ TILMS: 5 }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Jira/i }));
    expect(onTabChange).toHaveBeenCalledWith('jira');
    await user.click(screen.getByRole('button', { name: /^critical/i }));
    expect(onPriorityChange).toHaveBeenCalledWith('critical');
  });
});
