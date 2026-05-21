import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ensureAllUsdLocalDynamoTables } from '../../db/ensureUsdLocalDynamoTables.js';

/**
 * Creates all USD DynamoDB tables on Local when missing (idempotent).
 * Delegates to `ensureAllUsdLocalDynamoTables` so Phase 8 notification tables
 * and every other app table exist before integration tests run.
 *
 * Table name parameters are retained for caller compatibility; schemas use
 * fixed names from `ensureAllUsdLocalDynamoTables`.
 */
export async function ensureSupportTablesExist(
  client: DynamoDBClient,
  usersTable: string,
  rolesTable: string,
  ticketsTable?: string,
  commentsTable?: string,
): Promise<void> {
  void usersTable;
  void rolesTable;
  void ticketsTable;
  void commentsTable;
  await ensureAllUsdLocalDynamoTables(client);
}
