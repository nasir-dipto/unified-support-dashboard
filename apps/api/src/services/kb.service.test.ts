import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as postgres from '../db/postgres.client.js';
import { listKbArticles } from './kb.service.js';

describe('listKbArticles', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('filters by sourceTicketId using ANY(source_ticket_ids)', async () => {
    const query = vi.spyOn(postgres, 'queryPostgres').mockResolvedValue([]);
    await listKbArticles('demo-org', { sourceTicketId: 'hd_4', status: 'draft' });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('= ANY(source_ticket_ids)'),
      ['demo-org', 'draft', 'hd_4'],
    );
  });

  it('lists all articles for org when no filter', async () => {
    const query = vi.spyOn(postgres, 'queryPostgres').mockResolvedValue([]);
    await listKbArticles('demo-org');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE org_id = $1'),
      ['demo-org'],
    );
  });
});
