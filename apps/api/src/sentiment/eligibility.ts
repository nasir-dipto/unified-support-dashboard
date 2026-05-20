/** Minimum milliseconds between sentiment analyses for the same ticket. */
export const SENTIMENT_MIN_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Returns true when a ticket may be sent to Bedrock for sentiment (never more than once per hour).
 */
export function isEligibleForSentimentAnalysis(
  sentimentAt: string | null | undefined,
  nowMs: number,
): boolean {
  if (sentimentAt === undefined || sentimentAt === null || sentimentAt.length === 0) {
    return true;
  }
  const last = new Date(sentimentAt).getTime();
  if (Number.isNaN(last)) {
    return true;
  }
  return nowMs - last >= SENTIMENT_MIN_INTERVAL_MS;
}
