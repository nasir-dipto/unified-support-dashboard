import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { loadServerEnv, getServerEnv } from '../config/loadEnv.js';
import { processHelpdeskWebhookJson, processJiraWebhookJson } from './sqsConsumer.js';

/**
 * SQS-triggered webhook processor (AWS). Keeps Dynamo tickets in sync when ECS enqueues payloads.
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  loadServerEnv();
  const env = getServerEnv();
  const failures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    try {
      const bodyUnknown: unknown = JSON.parse(record.body);
      const arn = record.eventSourceARN;
      if (arn.includes('jira-events')) {
        await processJiraWebhookJson(bodyUnknown, env.JIRA_DEFAULT_ORG_ID);
      } else if (arn.includes('hd-events')) {
        await processHelpdeskWebhookJson(bodyUnknown, env.HD_DEFAULT_ORG_ID);
      } else {
        await processJiraWebhookJson(bodyUnknown, env.JIRA_DEFAULT_ORG_ID);
      }
    } catch {
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
}
