import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectFilter } from './ProjectFilter';

describe('ProjectFilter', () => {
  it('renders project options with counts', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ProjectFilter
        value=""
        projects={{ TILMS: 12, TPDI: 3 }}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/filter by project/i), 'TILMS');
    expect(onChange).toHaveBeenCalledWith('TILMS');
    expect(screen.getByRole('option', { name: 'TILMS (12)' })).toBeInTheDocument();
  });
});
