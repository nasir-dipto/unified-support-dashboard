import { describe, expect, it } from 'vitest';
import { AppError, toApiErrorBody } from './errors.js';

describe('toApiErrorBody', () => {
  it('maps AppError to API envelope', () => {
    const err = new AppError('nope', 'X', 418);
    expect(toApiErrorBody(err)).toEqual({
      error: 'nope',
      code: 'X',
      statusCode: 418,
    });
  });

  it('maps generic Error', () => {
    expect(toApiErrorBody(new Error('boom'))).toMatchObject({
      error: 'boom',
      code: 'INTERNAL',
      statusCode: 500,
    });
  });
});
