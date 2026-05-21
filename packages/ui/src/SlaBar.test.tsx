import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlaBar } from './SlaBar.js';

describe('SlaBar', () => {
  it('shows percentage', () => {
    render(<SlaBar value={72} />);
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('shows neutral placeholder when value is null', () => {
    render(<SlaBar value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
