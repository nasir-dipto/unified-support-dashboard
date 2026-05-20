import { describe, expect, it, vi } from 'vitest';
import { invokeAi } from './ai.js';

const postMock = vi.fn();

vi.mock('./client.js', () => ({
  apiClient: {
    post: (url: string, body: unknown) => postMock(url, body) as Promise<{ data: unknown }>,
  },
}));

describe('invokeAi', () => {
  it('parses triage response', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        engineerAction: 'Investigate logs',
        riskLevel: 'MED',
        suggestedAssignee: 'alice',
      },
    });
    const result = await invokeAi({ feature: 'triage_suggest', ticketId: 'hd_1' });
    expect(result).toMatchObject({
      engineerAction: 'Investigate logs',
      suggestedAssignee: 'alice',
    });
    expect(postMock).toHaveBeenCalledWith('/api/ai/invoke', {
      feature: 'triage_suggest',
      ticketId: 'hd_1',
    });
  });

  it('parses morning_briefing response', async () => {
    postMock.mockResolvedValueOnce({ data: { briefing: '• Summary' } });
    const result = await invokeAi({ feature: 'morning_briefing' });
    expect(result).toMatchObject({ briefing: '• Summary' });
  });

  it('parses comment_draft with tone', async () => {
    postMock.mockResolvedValueOnce({
      data: { draft: 'Hello', tone: 'technical', degraded: true },
    });
    const result = await invokeAi({
      feature: 'comment_draft',
      ticketId: 'jira_X',
      tone: 'technical',
    });
    expect(result).toMatchObject({ draft: 'Hello', tone: 'technical', degraded: true });
  });
});
