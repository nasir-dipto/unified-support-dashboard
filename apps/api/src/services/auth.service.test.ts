import { describe, expect, it } from 'vitest';
import { refreshSession } from '../services/auth.service.js';

describe('auth.service', () => {
  it('refreshSession rejects invalid token', async () => {
    await expect(refreshSession('not-a-jwt')).rejects.toThrow();
  });
});
