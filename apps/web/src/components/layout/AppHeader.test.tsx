import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useAuthStore } from '../../store/auth.store';
import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it('shows unified support branding', () => {
    useAuthStore.setState({
      accessToken: 't',
      refreshToken: 'r',
      user: {
        userId: 'u1',
        orgId: 'demo-org',
        email: 'admin@usd.dev',
        roles: ['admin'],
      },
    });
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByText('UNIFIED SUPPORT')).toBeInTheDocument();
    useAuthStore.getState().clear();
  });
});
