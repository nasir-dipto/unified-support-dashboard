import { describe, expect, it } from 'vitest';
import {
  buildCommentDraftPrompt,
  buildMorningBriefingPrompt,
  buildSentimentAnalysisPrompt,
  buildTriageSuggestPrompt,
} from './prompts.js';
import type { AiTicketContext } from './types.js';

const ctx: AiTicketContext = {
  ticket: {
    ticketId: 'jira_X',
    orgId: 'o',
    source: 'jira',
    externalId: 'X',
    summary: 'Issue',
    priority: 'high',
    status: 'open',
    createdAt: 't',
    updatedAt: 't',
  },
  comments: [],
  linked: undefined,
};

describe('prompts', () => {
  it('buildTriageSuggestPrompt requests JSON engineerAction', () => {
    const p = buildTriageSuggestPrompt(ctx);
    expect(p).toContain('engineerAction');
    expect(p).toContain('jira_X');
  });

  it('buildSentimentAnalysisPrompt requests sentiment JSON', () => {
    const p = buildSentimentAnalysisPrompt(ctx);
    expect(p).toContain('sentimentScore');
    expect(p).toContain('churnRisk');
  });

  it('buildMorningBriefingPrompt includes metrics', () => {
    const p = buildMorningBriefingPrompt('negative: 3');
    expect(p).toContain('bullet');
    expect(p).toContain('negative: 3');
  });

  it('buildCommentDraftPrompt includes tone', () => {
    const p = buildCommentDraftPrompt(ctx, 'empathetic');
    expect(p).toContain('empathetic');
    expect(p).toContain('"tone":"empathetic"');
  });
});
