import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Pill } from './Pill.js';

describe('Pill', () => {
  it('renders label and count', () => {
    render(<Pill label="All" count={3} active />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
