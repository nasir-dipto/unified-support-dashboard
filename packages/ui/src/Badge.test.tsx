import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge.js';

describe('Badge', () => {
  it('renders label', () => {
    render(<Badge label="open" color="#2563EB" />);
    expect(screen.getByText('open')).toBeInTheDocument();
  });
});
