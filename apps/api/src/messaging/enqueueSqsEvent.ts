import { getServerEnv } from '../config/loadEnv.js';

/**
 * Phase 2 stub: logs the event and returns. Full SQS wiring comes in a later phase.
 */
export function enqueueSqsEvent(eventType: string, payload: unknown): void {
  const env = getServerEnv();
  const isLocal =
    env.NODE_ENV === 'development' ||
    env.NODE_ENV === 'test' ||
    env.DYNAMODB_ENDPOINT !== undefined;
  const preview =
    typeof payload === 'string'
      ? payload.slice(0, 240)
      : JSON.stringify(payload).slice(0, 240);
  if (isLocal) {
    console.info(`[sqs-stub] (local) ${eventType} ${preview}`);
    return;
  }
  console.info(`[sqs-stub] (not wired) ${eventType} ${preview}`);
}
