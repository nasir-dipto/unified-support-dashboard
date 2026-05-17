import { describe, expect, it } from 'vitest';
import { aiInvokeRequestSchema, triageSuggestResponseSchema } from './schemas.js';

describe('ai schemas', () => {
  it('parses invoke request', () => {
    const p = aiInvokeRequestSchema.parse({
      feature: 'triage_suggest',
      ticketId: 'hd_1',
    });
    expect(p.feature).toBe('triage_suggest');
  });

  it('parses triage response', () => {
    const p = triageSuggestResponseSchema.parse({
      engineerAction: 'Check logs',
      riskLevel: 'LOW',
    });
    expect(p.engineerAction).toBe('Check logs');
  });
});
