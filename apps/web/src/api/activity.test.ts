import { describe, expect, it, vi } from 'vitest';
import { activityRecentResponseSchema } from '@usd/shared-types';
import { fetchRecentActivity } from './activity.js';

vi.mock('./client.js', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: activityRecentResponseSchema.parse({
        data: [
          {
            type: 'ticket_updated',
            ticketId: 'jira_1',
            orgId: 'demo-org',
            payload: {},
          },
        ],
        total: 1,
      }),
    }),
  },
}));

describe('activity api', () => {
  it('fetchRecentActivity parses response', async () => {
    const items = await fetchRecentActivity(10);
    expect(items).toHaveLength(1);
  });
});
