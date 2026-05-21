import { describe, expect, it, vi } from 'vitest';
import { checkKbDraftExists } from './kb.js';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock('./client.js', () => ({
  apiClient: {
    get: getMock,
  },
}));

describe('checkKbDraftExists', () => {
  it('returns true when draft articles exist for ticket', async () => {
    getMock.mockResolvedValue({
      data: {
        data: [
          {
            kbId: '01HZ',
            orgId: 'demo-org',
            title: 'T',
            problem: 'p',
            rootCause: 'r',
            resolutionSteps: 's',
            tags: [],
            sourceTicketIds: ['hd_1'],
            status: 'draft',
            createdBy: 'u1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
      },
    });
    await expect(checkKbDraftExists('hd_1')).resolves.toBe(true);
    expect(getMock).toHaveBeenCalledWith('/api/kb', {
      params: { status: 'draft', sourceTicketId: 'hd_1' },
    });
  });

  it('returns false when no drafts match', async () => {
    getMock.mockResolvedValue({ data: { data: [], total: 0 } });
    await expect(checkKbDraftExists('hd_99')).resolves.toBe(false);
  });
});
