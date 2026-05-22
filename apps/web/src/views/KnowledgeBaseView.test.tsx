import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as kbApi from '../api/kb.js';
import { KnowledgeBaseView } from './KnowledgeBaseView.js';

describe('KnowledgeBaseView', () => {
  it('renders heading', () => {
    vi.spyOn(kbApi, 'listPublishedKbArticles').mockResolvedValue([]);
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <KnowledgeBaseView />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
  });
});
