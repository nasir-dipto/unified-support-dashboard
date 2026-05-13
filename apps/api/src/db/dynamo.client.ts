import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getServerEnv } from '../config/loadEnv.js';

let documentClient: DynamoDBDocumentClient | undefined;

/**
 * Shared DynamoDB DocumentClient (AWS or local per DYNAMODB_ENDPOINT).
 */
export function getDocumentClient(): DynamoDBDocumentClient {
  if (documentClient !== undefined) {
    return documentClient;
  }
  const env = getServerEnv();
  const client = new DynamoDBClient({
    region: env.AWS_REGION,
    ...(env.DYNAMODB_ENDPOINT !== undefined
      ? { endpoint: env.DYNAMODB_ENDPOINT }
      : {}),
  });
  documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return documentClient;
}

/**
 * Clears the singleton client (Vitest only).
 */
export function resetDocumentClientForTests(): void {
  documentClient = undefined;
}
