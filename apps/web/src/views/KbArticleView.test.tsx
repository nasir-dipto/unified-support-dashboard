import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as kbApi from '../api/kb.js';
import { KbArticleView } from './KbArticleView.js';

describe('KbArticleView', () => {
  it('shows article title', async () => {
    vi.spyOn(kbApi, 'getPublishedKbArticle').mockResolvedValue({
      kbId: '01HZ',
      orgId: 'o',
      title: 'VPN Article',
      problem: 'P',
      rootCause: 'R',
      resolutionSteps: 'S',
      tags: [],
      sourceTicketIds: [],
      status: 'published',
      createdBy: 'u',
      createdAt: 't',
      updatedAt: 't',
    });
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/kb/01HZ']}>
          <Routes>
            <Route path="/kb/:kbId" element={<KbArticleView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('VPN Article')).toBeInTheDocument();
  });
});
