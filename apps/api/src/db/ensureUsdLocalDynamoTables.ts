import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  type AttributeDefinition,
  type CreateTableCommandInput,
  type DescribeTableCommandOutput,
  type GlobalSecondaryIndex,
  type KeySchemaElement,
} from '@aws-sdk/client-dynamodb';

/**
 * Returns true when DynamoDB reports the table already exists (concurrent create).
 */
function isResourceInUseException(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'ResourceInUseException'
  );
}

/**
 * Waits until a DynamoDB table reports ACTIVE status (best-effort for local dev).
 */
async function waitForTableActive(
  client: DynamoDBClient,
  tableName: string,
): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    const d: DescribeTableCommandOutput = await client.send(
      new DescribeTableCommand({ TableName: tableName }),
    );
    if (d.Table?.TableStatus === 'ACTIVE') {
      return;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * Creates a DynamoDB table when it does not already exist (idempotent).
 */
export async function ensureDynamoTableIfMissing(
  client: DynamoDBClient,
  tableName: string,
  attributeDefinitions: AttributeDefinition[],
  keySchema: KeySchemaElement[],
  gsis: GlobalSecondaryIndex[],
): Promise<void> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return;
  } catch (e: unknown) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'name' in e &&
      (e as { name?: string }).name === 'ResourceNotFoundException'
    ) {
      // fall through to create
    } else {
      throw e;
    }
  }
  const params: CreateTableCommandInput = {
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: attributeDefinitions,
    KeySchema: keySchema,
    ...(gsis.length > 0 ? { GlobalSecondaryIndexes: gsis } : {}),
  };
  try {
    await client.send(new CreateTableCommand(params));
  } catch (error: unknown) {
    if (!isResourceInUseException(error)) {
      throw error;
    }
  }
  await waitForTableActive(client, tableName);
}

/**
 * Creates all USD application tables on DynamoDB Local when missing.
 * Schema matches `infra/lib/usd-database-stack.ts` (UsdDatabaseStack).
 */
export async function ensureAllUsdLocalDynamoTables(
  client: DynamoDBClient,
): Promise<void> {
  await ensureDynamoTableIfMissing(
    client,
    'support_tickets',
    [
      { AttributeName: 'ticketId', AttributeType: 'S' },
      { AttributeName: 'orgId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'assigneeId', AttributeType: 'S' },
    ],
    [{ AttributeName: 'ticketId', KeyType: 'HASH' }],
    [
      {
        IndexName: 'orgId-createdAt',
        KeySchema: [
          { AttributeName: 'orgId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'orgId-status',
        KeySchema: [
          { AttributeName: 'orgId', KeyType: 'HASH' },
          { AttributeName: 'status', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'assigneeId-status',
        KeySchema: [
          { AttributeName: 'assigneeId', KeyType: 'HASH' },
          { AttributeName: 'status', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  );

  await ensureDynamoTableIfMissing(
    client,
    'support_users',
    [
      { AttributeName: 'orgId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    [
      { AttributeName: 'orgId', KeyType: 'HASH' },
      { AttributeName: 'userId', KeyType: 'RANGE' },
    ],
    [
      {
        IndexName: 'orgId-email',
        KeySchema: [
          { AttributeName: 'orgId', KeyType: 'HASH' },
          { AttributeName: 'email', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  );

  await ensureDynamoTableIfMissing(
    client,
    'support_roles',
    [
      { AttributeName: 'orgId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
    ],
    [
      { AttributeName: 'orgId', KeyType: 'HASH' },
      { AttributeName: 'userId', KeyType: 'RANGE' },
    ],
    [],
  );

  await ensureDynamoTableIfMissing(
    client,
    'support_kb',
    [
      { AttributeName: 'kbId', AttributeType: 'S' },
      { AttributeName: 'orgId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
    ],
    [{ AttributeName: 'kbId', KeyType: 'HASH' }],
    [
      {
        IndexName: 'orgId-createdAt',
        KeySchema: [
          { AttributeName: 'orgId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'orgId-category',
        KeySchema: [
          { AttributeName: 'orgId', KeyType: 'HASH' },
          { AttributeName: 'category', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  );

  await ensureDynamoTableIfMissing(
    client,
    'support_reports',
    [
      { AttributeName: 'reportId', AttributeType: 'S' },
      { AttributeName: 'orgId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
    ],
    [{ AttributeName: 'reportId', KeyType: 'HASH' }],
    [
      {
        IndexName: 'orgId-createdAt',
        KeySchema: [
          { AttributeName: 'orgId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  );

  await ensureDynamoTableIfMissing(
    client,
    'support_notification_rules',
    [
      { AttributeName: 'orgId', AttributeType: 'S' },
      { AttributeName: 'ruleType', AttributeType: 'S' },
    ],
    [
      { AttributeName: 'orgId', KeyType: 'HASH' },
      { AttributeName: 'ruleType', KeyType: 'RANGE' },
    ],
    [],
  );

  await ensureDynamoTableIfMissing(
    client,
    'support_ticket_comments',
    [
      { AttributeName: 'orgId', AttributeType: 'S' },
      { AttributeName: 'ticketCommentKey', AttributeType: 'S' },
    ],
    [
      { AttributeName: 'orgId', KeyType: 'HASH' },
      { AttributeName: 'ticketCommentKey', KeyType: 'RANGE' },
    ],
    [],
  );
}
