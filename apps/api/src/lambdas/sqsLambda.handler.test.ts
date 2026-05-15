import type { SQSEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import * as sqsConsumer from './sqsConsumer.js';

vi.mock('./sqsConsumer.js', () => ({
  processJiraWebhookJson: vi.fn(async () => {
    await Promise.resolve();
  }),
  processHelpdeskWebhookJson: vi.fn(async () => {
    await Promise.resolve();
  }),
}));

describe('sqsLambda.handler', () => {
  beforeEach(() => {
    vi.mocked(sqsConsumer.processJiraWebhookJson).mockClear();
    vi.mocked(sqsConsumer.processHelpdeskWebhookJson).mockClear();
    resetServerEnvForTests();
    process.env.NODE_ENV = 'test';
    process.env.LAMBDA_WEBHOOK_WORKER = 'true';
    process.env.SUPPORT_TICKETS_TABLE =
      process.env.SUPPORT_TICKETS_TABLE ?? 'support_tickets_test';
    process.env.AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
    loadServerEnv();
  });

  it('routes Jira queue payloads through processJiraWebhookJson', async () => {
    const { handler } = await import('./sqsLambda.handler.js');
    await handler({
      Records: [
        {
          messageId: 'm1',
          body: '{"issue":{"key":"Z-9","fields":{}}}',
          eventSourceARN: 'arn:aws:sqs:us-east-1:111:jira-events-queue',
        },
      ],
    } as SQSEvent);
    expect(sqsConsumer.processJiraWebhookJson).toHaveBeenCalledTimes(1);
    expect(sqsConsumer.processHelpdeskWebhookJson).not.toHaveBeenCalled();
  });

  it('routes Helpdesk queue payloads through processHelpdeskWebhookJson', async () => {
    const { handler } = await import('./sqsLambda.handler.js');
    await handler({
      Records: [
        {
          messageId: 'm2',
          body: '{"request":{"id":"4444444444440099","display_id":{"value":"9","display_value":"REQ-9"},"subject":"s"}}',
          eventSourceARN: 'arn:aws:sqs:us-east-1:111:hd-events-queue',
        },
      ],
    } as SQSEvent);
    expect(sqsConsumer.processHelpdeskWebhookJson).toHaveBeenCalledTimes(1);
  });
});
