import { describe, expect, it } from 'vitest';
import { getJwtKeyMaterial, clearJwtKeyCache } from './secrets.js';

describe('secrets', () => {
  it('returns inline PEM keys from env in test', async () => {
    clearJwtKeyCache();
    const keys = await getJwtKeyMaterial();
    expect(keys.privateKey).toContain('BEGIN PRIVATE KEY');
    expect(keys.publicKey).toContain('BEGIN PUBLIC KEY');
  });
});
