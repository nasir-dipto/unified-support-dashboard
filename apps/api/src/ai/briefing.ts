import {
  morningBriefingResponseSchema,
  type MorningBriefingResponse,
  type SentimentSummaryResponse,
} from '@usd/shared-types';
import { invokeBedrockJson, isMockAiEnabled } from '../services/bedrock.service.js';
import {
  degradedMorningBriefing,
  mockMorningBriefing,
} from './mockResponses.js';
import { buildMorningBriefingPrompt } from './prompts.js';

/**
 * Generates the manager morning briefing (mock or Bedrock).
 */
export async function runMorningBriefing(
  summary: SentimentSummaryResponse,
  promptText: string,
): Promise<MorningBriefingResponse> {
  if (isMockAiEnabled()) {
    return mockMorningBriefing({
      negativeCount: summary.counts.negative,
      positiveCount: summary.counts.positive,
      criticalOpen: summary.tickets.filter(
        (t) => t.priority === 'critical' && t.status === 'open',
      ).length,
      churnRiskCount: summary.tickets.filter((t) => t.churnRisk === true).length,
    });
  }

  try {
    const prompt = buildMorningBriefingPrompt(promptText);
    const raw = await invokeBedrockJson(prompt);
    const briefing =
      typeof raw.briefing === 'string'
        ? raw.briefing
        : typeof raw.text === 'string'
          ? raw.text
          : JSON.stringify(raw);
    return morningBriefingResponseSchema.parse({ briefing });
  } catch {
    return degradedMorningBriefing();
  }
}
