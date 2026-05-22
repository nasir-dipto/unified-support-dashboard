import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KbArticleReader } from './KbArticleReader.js';

describe('KbArticleReader', () => {
  it('shows article sections', () => {
    render(
      <KbArticleReader
        article={{
          kbId: '1',
          orgId: 'o',
          title: 'Test',
          problem: 'P',
          rootCause: 'R',
          resolutionSteps: 'S',
          tags: [],
          sourceTicketIds: [],
          status: 'published',
          createdBy: 'u',
          createdAt: 't',
          updatedAt: 't',
        }}
      />,
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });
});
