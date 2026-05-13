import { describe, expect, it } from 'vitest';
import { getServerEnv } from './loadEnv.js';

describe('server env', () => {
  it('loads test profile from setup-env', () => {
    expect(getServerEnv().NODE_ENV).toBe('test');
  });
});
