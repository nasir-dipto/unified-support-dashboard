import { describe, expect, it } from 'vitest';
import { getServerEnv } from '../config/loadEnv.js';
import { signAccessToken, verifyAccessToken } from './jwt.js';

describe('jwt', () => {
  it('signs and verifies an access token', async () => {
    const token = await signAccessToken({
      userId: '01HZTEST',
      orgId: 'org1',
      email: 'u@example.com',
      roles: ['viewer'],
    });
    const payload = await verifyAccessToken(token);
    expect(payload.sub).toBe('01HZTEST');
    expect(payload.orgId).toBe('org1');
    expect(payload.email).toBe('u@example.com');
    expect(payload.roles).toEqual(['viewer']);
    expect(getServerEnv().NODE_ENV).toBe('test');
  });
});
