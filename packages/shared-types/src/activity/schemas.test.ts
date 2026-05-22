import { describe, expect, it } from 'vitest';
import {
  activityRecentQuerySchema,
  activityRecentResponseSchema,
} from './schemas.js';

describe('activity schemas', () => {
  it('parses recent activity query with default limit', () => {
    const parsed = activityRecentQuerySchema.parse({});
    expect(parsed.limit).toBe(50);
  });

  it('parses recent activity response', () => {
    const parsed = activityRecentResponseSchema.parse({
      data: [
        {
          type: 'ticket_updated',
          ticketId: 'jira_1',
          orgId: 'demo-org',
          payload: {},
        },
      ],
      total: 1,
    });
    expect(parsed.total).toBe(1);
  });
});
