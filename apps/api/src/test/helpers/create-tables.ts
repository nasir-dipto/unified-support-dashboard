import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  ensureAllUsdLocalDynamoTables,
  ensureDynamoTableIfMissing,
} from '../../db/ensureUsdLocalDynamoTables.js';

/**
 * Creates Phase 1 DynamoDB tables on Local when missing (idempotent).
 * When `ticketsTable` is provided, ensures the full USD schema (including Phase 8
 * notification tables required for ticket list/detail SLA enrichment).
 */
export async function ensureSupportTablesExist(
  client: DynamoDBClient,
  usersTable: string,
  rolesTable: string,
  ticketsTable?: string,
  commentsTable?: string,
): Promise<void> {
  void commentsTable;
  if (ticketsTable !== undefined) {
    await ensureAllUsdLocalDynamoTables(client);
    return;
  }
  await ensureDynamoTableIfMissing(
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

  await ensureDynamoTableIfMissing(
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
