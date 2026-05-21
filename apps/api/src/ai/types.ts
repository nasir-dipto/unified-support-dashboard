import type { CommentDraftTone, TicketApiDto, TicketCommentApiDto } from '@usd/shared-types';

/**
 * Ticket + conversation thread assembled server-side for AI prompts.
 */
export type AiTicketContext = {
  ticket: TicketApiDto;
  comments: TicketCommentApiDto[];
  linked:
    | {
        ticket: TicketApiDto;
        comments: TicketCommentApiDto[];
      }
    | undefined;
};

export type MockTriageInput = {
  ticket: TicketApiDto;
  commentCount: number;
};

export type MockDraftInput = {
  ticket: TicketApiDto;
  tone: CommentDraftTone;
  commentCount: number;
};

export type MockSentimentInput = {
  ticket: TicketApiDto;
  commentCount: number;
};

export type MockBriefingInput = {
  negativeCount: number;
  positiveCount: number;
  criticalOpen: number;
  churnRiskCount: number;
};

export type MockKbDraftInput = {
  ticket: TicketApiDto;
  linkedTicketId?: string;
};
