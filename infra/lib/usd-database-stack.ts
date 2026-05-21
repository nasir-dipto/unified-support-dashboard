import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

/**
 * DynamoDB tables for tickets, users, roles, knowledge base, reports, and notification rules.
 * All GSIs are defined so queries can always scope by orgId where applicable.
 */
export class UsdDatabaseStack extends cdk.Stack {
  public readonly supportTicketsTable: dynamodb.Table;
  public readonly supportTicketCommentsTable: dynamodb.Table;
  private readonly tables: dynamodb.Table[] = [];

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.supportTicketsTable = new dynamodb.Table(this, 'SupportTickets', {
      tableName: 'support_tickets',
      partitionKey: { name: 'ticketId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.supportTicketsTable.addGlobalSecondaryIndex({
      indexName: 'orgId-createdAt',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.supportTicketsTable.addGlobalSecondaryIndex({
      indexName: 'orgId-status',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.supportTicketsTable.addGlobalSecondaryIndex({
      indexName: 'assigneeId-status',
      partitionKey: { name: 'assigneeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.tables.push(this.supportTicketsTable);

    this.supportTicketCommentsTable = new dynamodb.Table(this, 'SupportTicketComments', {
      tableName: 'support_ticket_comments',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ticketCommentKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.tables.push(this.supportTicketCommentsTable);

    const users = new dynamodb.Table(this, 'SupportUsers', {
      tableName: 'support_users',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    users.addGlobalSecondaryIndex({
      indexName: 'orgId-email',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.tables.push(users);

    const roles = new dynamodb.Table(this, 'SupportRoles', {
      tableName: 'support_roles',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.tables.push(roles);

    const kb = new dynamodb.Table(this, 'SupportKb', {
      tableName: 'support_kb',
      partitionKey: { name: 'kbId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    kb.addGlobalSecondaryIndex({
      indexName: 'orgId-createdAt',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    kb.addGlobalSecondaryIndex({
      indexName: 'orgId-category',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.tables.push(kb);

    const reports = new dynamodb.Table(this, 'SupportReports', {
      tableName: 'support_reports',
      partitionKey: { name: 'reportId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    reports.addGlobalSecondaryIndex({
      indexName: 'orgId-createdAt',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.tables.push(reports);

    const notificationRules = new dynamodb.Table(this, 'SupportNotificationRules', {
      tableName: 'support_notification_rules',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ruleType', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.tables.push(notificationRules);

    const notifications = new dynamodb.Table(this, 'SupportNotifications', {
      tableName: 'support_notifications',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'notificationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.tables.push(notifications);
  }

  /**
   * Grants read/write access to all USD application tables (used by the ECS task role).
   */
  public grantTableDataAccess(grantee: iam.IGrantable): void {
    for (const table of this.tables) {
      table.grantReadWriteData(grantee);
    }
  }
}
