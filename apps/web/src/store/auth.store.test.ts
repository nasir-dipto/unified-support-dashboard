import { describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';

describe('useAuthStore', () => {
  it('setSession stores tokens and user', () => {
    useAuthStore.getState().clear();
    useAuthStore.getState().setSession('a', 'r', {
      userId: 'u',
      orgId: 'o',
      email: 'e@e.com',
      roles: ['technician'],
    });
    expect(useAuthStore.getState().accessToken).toBe('a');
    expect(useAuthStore.getState().refreshToken).toBe('r');
    useAuthStore.getState().clear();
  });
});
