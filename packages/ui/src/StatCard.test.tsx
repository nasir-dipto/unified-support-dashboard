import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard.js';

describe('StatCard', () => {
  it('renders value and label', () => {
    render(<StatCard label="Open" value={5} color="#2563EB" />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});
