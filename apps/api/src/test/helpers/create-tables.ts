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
 */
export async function ensureSupportTablesExist(
  client: DynamoDBClient,
  usersTable: string,
  rolesTable: string,
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
