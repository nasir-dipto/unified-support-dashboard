import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as usersApi from '../../api/users.js';
import { useAuthStore } from '../../store/auth.store';
import { AdminUsersTab } from './AdminUsersTab.js';

describe('AdminUsersTab', () => {
  it('lists users for super_admin', async () => {
    useAuthStore.setState({
      user: {
        userId: '1',
        orgId: 'demo-org',
        email: 'admin@usd.dev',
        roles: ['super_admin'],
      },
      accessToken: 't',
      refreshToken: 'r',
    });
    vi.spyOn(usersApi, 'fetchUsers').mockResolvedValue({
      data: [{ userId: '2', email: 'm@usd.dev', role: 'manager', createdAt: 't' }],
      total: 1,
    });
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <AdminUsersTab />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('m@usd.dev')).toBeInTheDocument();
  });
});
