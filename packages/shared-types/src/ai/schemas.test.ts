import { describe, expect, it } from 'vitest';
import {
  aiInvokeRequestSchema,
  commentDraftResponseSchema,
  morningBriefingResponseSchema,
  triageSuggestResponseSchema,
} from './schemas.js';

describe('ai schemas', () => {
  it('parses triage_suggest request without context', () => {
    const p = aiInvokeRequestSchema.parse({
      feature: 'triage_suggest',
      ticketId: 'hd_1',
    });
    expect(p.feature).toBe('triage_suggest');
  });

  it('parses comment_draft request with tone', () => {
    const p = aiInvokeRequestSchema.parse({
      feature: 'comment_draft',
      ticketId: 'jira_X',
      tone: 'empathetic',
    });
    if (p.feature !== 'comment_draft') {
      throw new Error('expected comment_draft');
    }
    expect(p.tone).toBe('empathetic');
  });

  it('defaults comment_draft tone to professional', () => {
    const p = aiInvokeRequestSchema.parse({
      feature: 'comment_draft',
      ticketId: 'jira_X',
    });
    if (p.feature === 'comment_draft') {
      expect(p.tone).toBe('professional');
    }
  });

  it('parses triage response with suggestedAssignee and degraded', () => {
    const p = triageSuggestResponseSchema.parse({
      engineerAction: 'Check logs',
      riskLevel: 'LOW',
      suggestedAssignee: 'Jane Agent',
      degraded: true,
    });
    expect(p.suggestedAssignee).toBe('Jane Agent');
    expect(p.degraded).toBe(true);
  });

  it('parses morning_briefing request', () => {
    const p = aiInvokeRequestSchema.parse({ feature: 'morning_briefing' });
    expect(p.feature).toBe('morning_briefing');
  });

  it('parses morning briefing response', () => {
    const p = morningBriefingResponseSchema.parse({
      briefing: '• Risk summary',
      degraded: false,
    });
    expect(p.briefing).toContain('Risk');
  });

  it('parses comment draft response with tone', () => {
    const p = commentDraftResponseSchema.parse({
      draft: 'Hello',
      tone: 'technical',
    });
    expect(p.tone).toBe('technical');
  });
});
