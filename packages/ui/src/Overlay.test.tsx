import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Overlay } from './Overlay.js';

describe('Overlay', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title and children', () => {
    render(
      <Overlay title="Test" onClose={() => undefined}>
        <p>Body</p>
      </Overlay>,
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('calls onClose from close button', () => {
    const onClose = vi.fn();
    render(
      <Overlay title="Test" onClose={onClose}>
        <p>Body</p>
      </Overlay>,
    );
    fireEvent.click(screen.getByTestId('overlay-close'));
    expect(onClose).toHaveBeenCalled();
  });
});
