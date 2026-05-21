import { describe, expect, it, vi } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import * as bedrock from '../services/bedrock.service.js';
import { runKbDraft } from './kbDraft.js';
import type { AiTicketContext } from './types.js';

const ticket: TicketApiDto = {
  ticketId: 'hd_99',
  orgId: 'demo-org',
  source: 'helpdesk',
  externalId: '99',
  summary: 'VPN down',
  priority: 'high',
  status: 'resolved',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const ctx: AiTicketContext = { ticket, comments: [], linked: undefined };

describe('runKbDraft', () => {
  it('returns mock draft when USE_MOCK_AI', async () => {
    vi.spyOn(bedrock, 'isMockAiEnabled').mockReturnValue(true);
    const res = await runKbDraft(ctx);
    expect(res.title).toContain('VPN');
    expect(res.sourceTicketIds).toContain('hd_99');
  });

  it('returns degraded draft on Bedrock failure', async () => {
    vi.spyOn(bedrock, 'isMockAiEnabled').mockReturnValue(false);
    vi.spyOn(bedrock, 'invokeBedrockJson').mockRejectedValue(new Error('timeout'));
    const res = await runKbDraft(ctx);
    expect(res.degraded).toBe(true);
  });
});
