import { describe, expect, it } from 'vitest';
import {
  EMBEDDING_DIMENSION,
  formatVectorLiteral,
  mockEmbedding,
} from './embedding.service.js';

describe('embedding.service', () => {
  it('mockEmbedding returns normalized 1024-dim vector', () => {
    const v = mockEmbedding('login failure');
    expect(v).toHaveLength(EMBEDDING_DIMENSION);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('formatVectorLiteral wraps array for pgvector', () => {
    expect(formatVectorLiteral([1, 2])).toBe('[1,2]');
  });
});
