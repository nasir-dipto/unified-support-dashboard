import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SentimentBadge } from './SentimentBadge';

describe('SentimentBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders sentiment label', () => {
    render(<SentimentBadge sentiment="negative" />);
    expect(screen.getByText('negative')).toBeInTheDocument();
  });

  it('renders nothing when sentiment is null', () => {
    const { container } = render(<SentimentBadge sentiment={null} />);
    expect(container.textContent).toBe('');
  });
});
