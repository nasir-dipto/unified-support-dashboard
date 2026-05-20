import type {
  CommentDraftResponse,
  CommentDraftTone,
  MorningBriefingResponse,
  SentimentAnalysisResult,
  TriageSuggestResponse,
} from '@usd/shared-types';
import type { MockBriefingInput, MockDraftInput, MockSentimentInput, MockTriageInput } from './types.js';

const DEGRADED_TRIAGE_MESSAGE =
  'AI temporarily unavailable. Please review manually.';

const DEGRADED_DRAFT_MESSAGE =
  'AI temporarily unavailable. Please review manually.';

/**
 * Maps ticket priority to a mock risk level for triage suggestions.
 */
function riskFromPriority(priority: string): 'LOW' | 'MED' | 'HIGH' {
  if (priority === 'critical' || priority === 'high') {
    return 'HIGH';
  }
  if (priority === 'medium') {
    return 'MED';
  }
  return 'LOW';
}

/**
 * Returns a realistic mock triage suggestion (USE_MOCK_AI=true).
 */
export function mockTriageSuggest(input: MockTriageInput): TriageSuggestResponse {
  const { ticket, commentCount } = input;
  const risk = riskFromPriority(ticket.priority);
  const threadHint =
    commentCount > 0
      ? `Review the ${String(commentCount)} message(s) in the thread before replying.`
      : 'No conversation history yet — confirm scope with the requester.';
  const actionByPriority: Record<string, string> = {
    critical: `Escalate ${ticket.externalId}: verify SLA breach, assign senior engineer, and post a status update within 1 hour. ${threadHint}`,
    high: `Prioritize ${ticket.externalId}: reproduce the issue, check recent changes, and document findings in the ticket. ${threadHint}`,
    medium: `Triage ${ticket.externalId}: gather logs, validate environment, and propose next steps. ${threadHint}`,
    low: `Handle ${ticket.externalId} in normal queue: confirm resolution path and close when verified. ${threadHint}`,
  };
  return {
    engineerAction:
      actionByPriority[ticket.priority] ??
      `Triage ${ticket.externalId}: gather logs and propose next steps. ${threadHint}`,
    riskLevel: risk,
    riskReason: `${ticket.priority} priority ${ticket.source} ticket (${ticket.status})`,
    suggestedAssignee: ticket.assigneeId,
  };
}

/**
 * Returns degraded triage JSON (Bedrock timeout/failure) — HTTP 200.
 */
export function degradedTriageSuggest(): TriageSuggestResponse {
  return {
    engineerAction: DEGRADED_TRIAGE_MESSAGE,
    riskLevel: 'MED',
    riskReason: 'AI service unavailable',
    degraded: true,
  };
}

const TONE_INTROS: Record<CommentDraftTone, string> = {
  professional: 'Thank you for your patience.',
  empathetic: 'I understand how frustrating this must be, and I am here to help.',
  technical: 'We have reviewed the technical details of your request.',
};

/**
 * Returns a realistic mock comment draft (USE_MOCK_AI=true).
 */
export function mockCommentDraft(input: MockDraftInput): CommentDraftResponse {
  const { ticket, tone, commentCount } = input;
  const intro = TONE_INTROS[tone];
  const context =
    commentCount > 0
      ? 'Based on the conversation so far, '
      : 'Regarding your request, ';
  return {
    draft: `${intro} ${context}we are actively working on "${ticket.summary}" (${ticket.externalId}) and will provide an update shortly.`,
    tone,
  };
}

/**
 * Returns degraded comment draft JSON (Bedrock timeout/failure) — HTTP 200.
 */
export function degradedCommentDraft(tone: CommentDraftTone): CommentDraftResponse {
  return {
    draft: DEGRADED_DRAFT_MESSAGE,
    tone,
    degraded: true,
  };
}

const NEGATIVE_HINTS = ['frustrat', 'angry', 'urgent', 'broken', 'fail', 'cannot', "can't", 'unacceptable'];
const POSITIVE_HINTS = ['thank', 'resolved', 'appreciate', 'great', 'works'];

/**
 * Returns realistic mock sentiment for a Helpdesk ticket (USE_MOCK_AI=true).
 */
export function mockSentimentAnalysis(input: MockSentimentInput): SentimentAnalysisResult {
  const { ticket, commentCount } = input;
  const text = `${ticket.summary} ${ticket.description ?? ''}`.toLowerCase();
  let negativeHits = 0;
  let positiveHits = 0;
  for (const w of NEGATIVE_HINTS) {
    if (text.includes(w)) {
      negativeHits += 1;
    }
  }
  for (const w of POSITIVE_HINTS) {
    if (text.includes(w)) {
      positiveHits += 1;
    }
  }
  if (ticket.priority === 'critical' || ticket.priority === 'high') {
    negativeHits += 1;
  }
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    positiveHits += 1;
  }
  if (commentCount === 0) {
    return { sentiment: 'neutral', sentimentScore: 0, churnRisk: false };
  }
  if (negativeHits > positiveHits) {
    const score = Math.max(-1, -0.35 - negativeHits * 0.15);
    return {
      sentiment: 'negative',
      sentimentScore: score,
      churnRisk: ticket.priority === 'critical' || ticket.priority === 'high',
    };
  }
  if (positiveHits > negativeHits) {
    return { sentiment: 'positive', sentimentScore: 0.55, churnRisk: false };
  }
  return { sentiment: 'neutral', sentimentScore: 0.05, churnRisk: false };
}

const DEGRADED_BRIEFING_MESSAGE =
  'AI temporarily unavailable. Review the Sentiment tab and open tickets manually.';

/**
 * Returns a realistic mock morning briefing (USE_MOCK_AI=true).
 */
export function mockMorningBriefing(input: MockBriefingInput): MorningBriefingResponse {
  return {
    briefing: [
      `• Overall: ${String(input.positiveCount)} positive, ${String(input.negativeCount)} negative Helpdesk tickets in view.`,
      `• At-risk: ${String(input.churnRiskCount)} ticket(s) flagged for churn risk — prioritize enterprise accounts.`,
      `• Trend: Negative volume ${input.negativeCount > input.positiveCount ? 'elevated' : 'stable'} week over week.`,
      `• SLA: ${String(input.criticalOpen)} critical ticket(s) open — verify assignees and response times.`,
      '• Action: Review top negative accounts and schedule CSM check-ins before end of day.',
    ].join('\n'),
  };
}

/**
 * Returns degraded morning briefing (Bedrock failure) — HTTP 200.
 */
export function degradedMorningBriefing(): MorningBriefingResponse {
  return { briefing: DEGRADED_BRIEFING_MESSAGE, degraded: true };
}
