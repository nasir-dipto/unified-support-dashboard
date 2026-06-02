import { describe, expect, it } from 'vitest';
import { resolveDefaultOrgId } from './default-org.js';

describe('resolveDefaultOrgId', () => {
  it('returns ti when env is unset or empty', () => {
    expect(resolveDefaultOrgId()).toBe('ti');
  });
});
