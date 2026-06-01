import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TicketFilters } from './TicketFilters';

afterEach(() => {
  cleanup();
});

const baseProps = {
  tab: 'all' as const,
  onTabChange: vi.fn(),
  bucket: 'open' as const,
  onBucketChange: vi.fn(),
  priority: 'all' as const,
  onPriorityChange: vi.fn(),
  search: '',
  onSearchChange: vi.fn(),
  project: '',
  onProjectChange: vi.fn(),
  sort: 'newest' as const,
  onSortChange: vi.fn(),
  counts: { all: 31, mine: 2, jira: 7, me: 3 },
  bucketCounts: { all: 31, open: 25, closed: 6 },
  projectCounts: { TILMS: 5 },
};

describe('TicketFilters', () => {
  it('fires tab, bucket, and priority changes', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const onBucketChange = vi.fn();
    const onPriorityChange = vi.fn();
    render(
      <TicketFilters
        {...baseProps}
        onTabChange={onTabChange}
        onBucketChange={onBucketChange}
        onPriorityChange={onPriorityChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Jira/i }));
    expect(onTabChange).toHaveBeenCalledWith('jira');
    await user.click(screen.getByRole('button', { name: /^Closed/i }));
    expect(onBucketChange).toHaveBeenCalledWith('closed');
    await user.click(screen.getByRole('button', { name: /^critical/i }));
    expect(onPriorityChange).toHaveBeenCalledWith('critical');
  });

  it('shows bucket counts on status pills', () => {
    render(<TicketFilters {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Open 25' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Closed 6' })).toBeInTheDocument();
  });
});
