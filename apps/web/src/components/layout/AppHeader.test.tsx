import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/auth.store';
import { AppHeader } from './AppHeader';

vi.mock('../notifications/NotificationBell', () => ({
  NotificationBell: () => <span data-testid="notification-bell" />,
}));

describe('AppHeader', () => {
  it('shows UnifyDesk branding', () => {
    useAuthStore.setState({
      accessToken: 't',
      refreshToken: 'r',
      user: {
        userId: 'u1',
        orgId: 'demo-org',
        email: 'admin@usd.dev',
        roles: ['super_admin'],
      },
    });
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByText('UnifyDesk')).toBeInTheDocument();
    expect(screen.getByText('Unified Support Dashboard')).toBeInTheDocument();
    useAuthStore.getState().clear();
  });
});
