import { describe } from 'vitest';

/**
 * Returns true when `DYNAMODB_ENDPOINT` is set (DynamoDB Local or CI service container).
 */
export function hasDynamoDbEndpoint(): boolean {
  const raw = process.env.DYNAMODB_ENDPOINT;
  return raw !== undefined && raw.trim().length > 0;
}

/**
 * `describe` for DynamoDB integration suites; skips when `DYNAMODB_ENDPOINT` is unset.
 */
export const dynamoDescribe = hasDynamoDbEndpoint() ? describe : describe.skip;
