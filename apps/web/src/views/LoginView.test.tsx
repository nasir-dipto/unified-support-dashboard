import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, vi, type Mock } from 'vitest';
import { LoginView } from './LoginView';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({
      data: {
        accessToken: 'at',
        refreshToken: 'rt',
        user: {
          userId: '01HZWEB',
          orgId: 'demo-org',
          email: 'u@example.com',
          roles: ['technician'],
        },
      },
    }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('LoginView', () => {
  it('submits login form', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/email/i), 'u@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'secret1234');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- mocked axios instance method
    const post = apiClient.post as Mock;
    assert.equal(post.mock.calls.length, 1);
    const firstCall = post.mock.calls[0] as [string, { orgId: string; email: string; password: string }];
    assert.equal(firstCall[0], '/api/auth/login');
    assert.deepStrictEqual(firstCall[1], {
      orgId: 'ti',
      email: 'u@example.com',
      password: 'secret1234',
    });
  });
});
