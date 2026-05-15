import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';

const DLQ_RETENTION = cdk.Duration.days(14);
const QUEUE_RETENTION = cdk.Duration.days(14);
const MAX_RECEIVE_COUNT = 3;

export interface UsdMessagingStackProps extends cdk.StackProps {
  /** Primary ticket store consumed by the webhook queue Lambda worker. */
  readonly ticketsTable: dynamodb.ITable;
}

/**
 * SQS queues for Jira and Helpdesk event ingestion (each with DLQ), webhook processor Lambda,
 * and DLQ CloudWatch alarms.
 */
export class UsdMessagingStack extends cdk.Stack {
  public readonly jiraEventsQueue: sqs.Queue;
  public readonly jiraEventsDlq: sqs.Queue;
  public readonly hdEventsQueue: sqs.Queue;
  public readonly hdEventsDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: UsdMessagingStackProps) {
    super(scope, id, props);

    this.jiraEventsDlq = new sqs.Queue(this, 'JiraEventsDlq', {
      queueName: 'jira-events-dlq',
      retentionPeriod: DLQ_RETENTION,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.jiraEventsQueue = new sqs.Queue(this, 'JiraEventsQueue', {
      queueName: 'jira-events-queue',
      retentionPeriod: QUEUE_RETENTION,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deadLetterQueue: {
        queue: this.jiraEventsDlq,
        maxReceiveCount: MAX_RECEIVE_COUNT,
      },
    });

    this.hdEventsDlq = new sqs.Queue(this, 'HdEventsDlq', {
      queueName: 'hd-events-dlq',
      retentionPeriod: DLQ_RETENTION,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.hdEventsQueue = new sqs.Queue(this, 'HdEventsQueue', {
      queueName: 'hd-events-queue',
      retentionPeriod: QUEUE_RETENTION,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deadLetterQueue: {
        queue: this.hdEventsDlq,
        maxReceiveCount: MAX_RECEIVE_COUNT,
      },
    });

    const webhookConsumer = new NodejsFunction(this, 'UsdWebhookQueueConsumer', {
      functionName: 'usd-webhook-queue-consumer-dev',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../apps/api/src/lambdas/sqsLambda.handler.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      reservedConcurrentExecutions: 10,
      environment: {
        NODE_ENV: 'production',
        SUPPORT_TICKETS_TABLE: props.ticketsTable.tableName,
        LAMBDA_WEBHOOK_WORKER: 'true',
      },
      bundling: {
        sourceMap: true,
        minify: true,
      },
      depsLockFilePath: path.join(__dirname, '../../pnpm-lock.yaml'),
      projectRoot: path.join(__dirname, '../..'),
    });

    props.ticketsTable.grantReadWriteData(webhookConsumer);

    webhookConsumer.addEventSource(
      new lambdaEventSources.SqsEventSource(this.jiraEventsQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      }),
    );
    webhookConsumer.addEventSource(
      new lambdaEventSources.SqsEventSource(this.hdEventsQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      }),
    );

    new cloudwatch.Alarm(this, 'JiraEventsDlqDepthAlarm', {
      alarmDescription: 'USD Jira webhook DLQ has visible messages',
      metric: this.jiraEventsDlq.metricApproximateNumberOfMessagesVisible({
        statistic: 'Maximum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Alarm(this, 'HdEventsDlqDepthAlarm', {
      alarmDescription: 'USD Helpdesk webhook DLQ has visible messages',
      metric: this.hdEventsDlq.metricApproximateNumberOfMessagesVisible({
        statistic: 'Maximum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }

  /**
   * Grants send/receive/delete permissions for both integration queues to the grantee.
   */
  public grantQueuesAccess(grantee: iam.IGrantable): void {
    this.jiraEventsQueue.grantSendMessages(grantee);
    this.jiraEventsQueue.grantConsumeMessages(grantee);
    this.hdEventsQueue.grantSendMessages(grantee);
    this.hdEventsQueue.grantConsumeMessages(grantee);
  }
}
