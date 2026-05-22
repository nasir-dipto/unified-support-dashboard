import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InviteUserForm } from './InviteUserForm.js';

describe('InviteUserForm', () => {
  it('renders invite form', () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <InviteUserForm />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Invite user')).toBeInTheDocument();
  });
});
