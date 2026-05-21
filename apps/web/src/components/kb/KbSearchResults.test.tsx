import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { KbSearchResults } from './KbSearchResults';

describe('KbSearchResults', () => {
  afterEach(() => {
    cleanup();
  });
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
    const sources = screen.getByTestId('kb-search-sources');
    expect(sources).toHaveTextContent('Sources: hd_1');
    expect(sources.className).toContain('text-indigo-800');
  });

  it('omits sources line when sourceTicketIds is empty', () => {
    render(
      <KbSearchResults
        results={[
          {
            kbId: '01HZ',
            title: 'No sources',
            problem: 'Problem',
            similarity: 0.5,
            sourceTicketIds: [],
          },
        ]}
      />,
    );
    expect(screen.queryByTestId('kb-search-sources')).toBeNull();
  });
});
