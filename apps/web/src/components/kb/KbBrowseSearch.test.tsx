import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KbBrowseSearch } from './KbBrowseSearch.js';

describe('KbBrowseSearch', () => {
  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KbBrowseSearch value="" onChange={onChange} />);
    await user.type(screen.getByPlaceholderText(/search published/i), 'vpn');
    expect(onChange).toHaveBeenCalled();
  });
});
