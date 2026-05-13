import { describe, expect, it } from 'vitest';
import { getDocumentClient } from './dynamo.client.js';

describe('getDocumentClient', () => {
  it('returns a document client singleton', () => {
    const a = getDocumentClient();
    const b = getDocumentClient();
    expect(a).toBe(b);
  });
});
