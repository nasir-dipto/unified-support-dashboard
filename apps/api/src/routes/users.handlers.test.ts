import { describe, expect, it } from 'vitest';
import { canMutateUsers } from '../utils/role-helpers.js';

describe('users.handlers permissions', () => {
  it('only super_admin mutates users', () => {
    expect(canMutateUsers(['super_admin'])).toBe(true);
    expect(canMutateUsers(['manager'])).toBe(false);
  });
});
