import type {
  CommentDraftResponse,
  CommentDraftTone,
  TriageSuggestResponse,
} from '@usd/shared-types';
import type { MockDraftInput, MockTriageInput } from './types.js';

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
