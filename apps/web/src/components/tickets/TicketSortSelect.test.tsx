import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketSortSelect } from './TicketSortSelect';

describe('TicketSortSelect', () => {
  it('calls onChange when sort changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TicketSortSelect value="newest" onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText(/sort tickets/i), 'priority');
    expect(onChange).toHaveBeenCalledWith('priority');
  });
});
