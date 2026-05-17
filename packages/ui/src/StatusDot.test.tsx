import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusDot } from './StatusDot.js';

describe('StatusDot', () => {
  it('renders a span', () => {
    const { container } = render(<StatusDot color="#059669" />);
    expect(container.querySelector('span')).not.toBeNull();
  });
});
