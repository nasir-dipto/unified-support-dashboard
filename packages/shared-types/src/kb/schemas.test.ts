import { describe, expect, it } from 'vitest';
import { createKbArticleBodySchema, kbArticleSchema, kbSearchRequestSchema } from './schemas.js';

describe('kb schemas', () => {
  it('parses kb article', () => {
    const a = kbArticleSchema.parse({
      kbId: '01HZKB0001',
      orgId: 'demo-org',
      title: 'Fix login',
      problem: 'Users cannot login',
      rootCause: 'Token expiry',
      resolutionSteps: 'Reset tokens',
      tags: ['auth'],
      sourceTicketIds: ['hd_1'],
      status: 'draft',
      createdBy: 'u1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(a.status).toBe('draft');
  });

  it('parses create body and search request', () => {
    expect(createKbArticleBodySchema.parse({ title: 'T', problem: 'p', rootCause: 'r', resolutionSteps: 's' }).tags).toEqual([]);
    expect(kbSearchRequestSchema.parse({ ticketId: 'hd_1' }).ticketId).toBe('hd_1');
  });
});
