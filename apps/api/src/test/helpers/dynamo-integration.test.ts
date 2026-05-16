import { afterEach, describe, expect, it } from 'vitest';
import { hasDynamoDbEndpoint } from './dynamo-integration.js';

describe('hasDynamoDbEndpoint', () => {
  const original = process.env.DYNAMODB_ENDPOINT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DYNAMODB_ENDPOINT;
    } else {
      process.env.DYNAMODB_ENDPOINT = original;
    }
  });

  it('returns false when unset', () => {
    delete process.env.DYNAMODB_ENDPOINT;
    expect(hasDynamoDbEndpoint()).toBe(false);
  });

  it('returns false when blank', () => {
    process.env.DYNAMODB_ENDPOINT = '   ';
    expect(hasDynamoDbEndpoint()).toBe(false);
  });

  it('returns true when set', () => {
    process.env.DYNAMODB_ENDPOINT = 'http://127.0.0.1:8000';
    expect(hasDynamoDbEndpoint()).toBe(true);
  });
});
