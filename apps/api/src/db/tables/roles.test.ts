import { describe, expect, it } from 'vitest';
import type { SupportRoleRecord } from './roles.js';

describe('roles table types', () => {
  it('stores org-scoped role assignment', () => {
    const r: SupportRoleRecord = {
      orgId: 'o',
      userId: 'u',
      role: 'agent',
    };
    expect(r.role).toBe('agent');
  });
});
