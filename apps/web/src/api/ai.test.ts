import { describe, expect, it, vi } from 'vitest';
import { invokeAi } from './ai.js';

vi.mock('./client.js', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({
      data: { engineerAction: 'Investigate logs', riskLevel: 'MED' },
    }),
  },
}));

describe('invokeAi', () => {
  it('parses triage response', async () => {
    const result = await invokeAi({ feature: 'triage_suggest', ticketId: 'hd_1' });
    expect(result).toMatchObject({ engineerAction: 'Investigate logs' });
  });
});
