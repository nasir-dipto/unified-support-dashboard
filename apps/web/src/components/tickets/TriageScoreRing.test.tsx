import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TriageScoreRing } from './TriageScoreRing';

describe('TriageScoreRing', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders score and title', () => {
    render(<TriageScoreRing score={72} />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByTitle('Triage score 72')).toBeInTheDocument();
  });
});
