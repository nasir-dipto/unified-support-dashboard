import { describe, expect, it } from 'vitest';
import { wsOutboundEnvelopeSchema } from './schemas.js';

describe('wsOutboundEnvelopeSchema', () => {
  it('accepts Phase 4 lifecycle envelopes', () => {
    const parsed = wsOutboundEnvelopeSchema.parse({
      type: 'ticket_created',
      ticketId: 'jira_ABC-1',
      orgId: 'org',
      payload: { ticket: { ticketId: 'jira_ABC-1' } },
    });
    expect(parsed.type).toBe('ticket_created');
  });
});
