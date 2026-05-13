import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';

const DLQ_RETENTION = cdk.Duration.days(14);
const QUEUE_RETENTION = cdk.Duration.days(14);
const MAX_RECEIVE_COUNT = 3;

/**
 * SQS queues for Jira and Helpdesk event ingestion, each with a dedicated DLQ.
 */
export class UsdMessagingStack extends cdk.Stack {
  public readonly jiraEventsQueue: sqs.Queue;
  public readonly jiraEventsDlq: sqs.Queue;
  public readonly hdEventsQueue: sqs.Queue;
  public readonly hdEventsDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
