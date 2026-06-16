import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { resolveLoginErrorMessage } from './login-error';

describe('resolveLoginErrorMessage', () => {
  it('returns network message when API is unreachable', () => {
    const err = new axios.AxiosError('Network Error', 'ERR_NETWORK');
    expect(resolveLoginErrorMessage(err)).toContain('Cannot reach the API');
  });

  it('returns API error body when present', () => {
    const err = new axios.AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: { error: 'Invalid credentials', code: 'UNAUTHORIZED', statusCode: 401 },
    });
    expect(resolveLoginErrorMessage(err)).toBe('Invalid credentials');
  });

  it('returns rate limit message for HTTP 429', () => {
    const err = new axios.AxiosError('Too Many', '429', undefined, undefined, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: { error: 'Too many requests', code: 'RATE_LIMITED', statusCode: 429 },
    });
    expect(resolveLoginErrorMessage(err)).toContain('Too many login attempts');
  });
});
