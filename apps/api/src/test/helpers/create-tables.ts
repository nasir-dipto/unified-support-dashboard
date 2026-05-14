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
 * Creates Phase 1 DynamoDB tables on Local when missing (idempotent).
 * Optionally creates `support_tickets` (Phase 2) when `ticketsTable` is provided.
 */
export async function ensureSupportTablesExist(
  client: DynamoDBClient,
  usersTable: string,
  rolesTable: string,
  ticketsTable?: string,
): Promise<void> {
  await ensureTable(
    client,
    usersTable,
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

  await ensureTable(
    client,
    rolesTable,
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

  if (ticketsTable !== undefined) {
    await ensureTable(
      client,
      ticketsTable,
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
  }
}

async function ensureTable(
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
  await client.send(new CreateTableCommand(params));
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
