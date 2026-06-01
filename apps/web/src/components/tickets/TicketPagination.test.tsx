import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketPagination } from './TicketPagination';

describe('TicketPagination', () => {
  it('navigates pages and disables edges', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <TicketPagination
        pagination={{
          page: 2,
          limit: 10,
          total: 30,
          totalPages: 3,
          hasNext: true,
          hasPrev: true,
        }}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: /first page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
