import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KbSearchResults } from './KbSearchResults';

describe('KbSearchResults', () => {
  it('renders note and results', () => {
    render(
      <KbSearchResults
        note="Best results on resolved tickets"
        results={[
          {
            kbId: '01HZ',
            title: 'VPN fix',
            problem: 'Users offline',
            similarity: 0.82,
            sourceTicketIds: ['hd_1'],
          },
        ]}
      />,
    );
    expect(screen.getByText(/best results on resolved tickets/i)).toBeTruthy();
    expect(screen.getByText('VPN fix')).toBeTruthy();
    expect(screen.getByText(/82% match/)).toBeTruthy();
  });
});
