import { describe, expect, it } from 'vitest';
import {
  degradedCommentDraft,
  degradedTriageSuggest,
  mockCommentDraft,
  mockTriageSuggest,
} from './mockResponses.js';

describe('mockResponses', () => {
  it('mockTriageSuggest returns engineerAction and risk', () => {
    const res = mockTriageSuggest({
      ticket: {
        ticketId: 'jira_A',
        orgId: 'o',
        source: 'jira',
        externalId: 'A',
        summary: 'Login fail',
        priority: 'high',
        status: 'open',
        createdAt: 't',
        updatedAt: 't',
      },
      commentCount: 2,
    });
    expect(res.engineerAction).toContain('A');
    expect(res.riskLevel).toBe('HIGH');
  });

  it('degradedTriageSuggest sets degraded flag', () => {
    expect(degradedTriageSuggest().degraded).toBe(true);
    expect(degradedTriageSuggest().engineerAction).toContain('unavailable');
  });

  it('mockCommentDraft varies by tone', () => {
    const pro = mockCommentDraft({
      ticket: {
        ticketId: 'hd_1',
        orgId: 'o',
        source: 'helpdesk',
        externalId: '1',
        summary: 'Printer',
        priority: 'medium',
        status: 'open',
        createdAt: 't',
        updatedAt: 't',
      },
      tone: 'empathetic',
      commentCount: 0,
    });
    expect(pro.tone).toBe('empathetic');
    expect(pro.draft).toContain('frustrating');
  });

  it('degradedCommentDraft preserves tone', () => {
    const res = degradedCommentDraft('technical');
    expect(res.tone).toBe('technical');
    expect(res.degraded).toBe(true);
  });
});
