import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { KbArticleList } from './KbArticleList.js';

describe('KbArticleList', () => {
  it('renders article links', () => {
    render(
      <MemoryRouter>
        <KbArticleList
          articles={[
            {
              kbId: '01HZ',
              orgId: 'o',
              title: 'VPN fix',
              problem: 'Cannot connect',
              rootCause: 'Cert',
              resolutionSteps: 'Renew',
              tags: ['vpn'],
              sourceTicketIds: [],
              status: 'published',
              createdBy: 'u',
              createdAt: 't',
              updatedAt: 't',
            },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /vpn fix/i })).toHaveAttribute('href', '/kb/01HZ');
  });
});
