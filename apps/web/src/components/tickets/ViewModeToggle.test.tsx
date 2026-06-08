import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ViewModeToggle } from './ViewModeToggle';

afterEach(() => {
  cleanup();
});

describe('ViewModeToggle', () => {
  it('renders list and grid options', () => {
    render(<ViewModeToggle value="list" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^List$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Grid$/i })).toBeInTheDocument();
  });

  it('calls onChange when grid is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewModeToggle value="list" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /^Grid$/i }));
    expect(onChange).toHaveBeenCalledWith('grid');
  });

  it('marks active mode with aria-pressed', () => {
    render(<ViewModeToggle value="grid" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Grid$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^List$/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
