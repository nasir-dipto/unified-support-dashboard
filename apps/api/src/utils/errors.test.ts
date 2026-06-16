import { describe, expect, it, vi } from 'vitest';
import { AppError, logApiError, toApiErrorBody } from './errors.js';

describe('toApiErrorBody', () => {
  it('maps AppError to API envelope', () => {
    const err = new AppError('nope', 'X', 418);
    expect(toApiErrorBody(err)).toEqual({
      error: 'nope',
      code: 'X',
      statusCode: 418,
    });
  });

  it('sanitizes integration AppError messages', () => {
    const err = new AppError(
      'Jira API error 403: {"errorMessages":["Forbidden"]}',
      'JIRA_API',
      403,
    );
    expect(toApiErrorBody(err)).toEqual({
      error: 'Integration error — please try again',
      code: 'JIRA_API',
      statusCode: 403,
    });
  });

  it('maps generic Error to a safe internal message', () => {
    expect(toApiErrorBody(new Error('boom'))).toEqual({
      error: 'An unexpected error occurred',
      code: 'INTERNAL',
      statusCode: 500,
    });
  });
});

describe('logApiError', () => {
  it('logs integration AppError details server-side', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const err = new AppError('Helpdesk API error 502: raw body', 'HELPDESK_API', 502);
    logApiError(err);
    expect(spy).toHaveBeenCalledWith('[api] HELPDESK_API:', 'Helpdesk API error 502: raw body');
    spy.mockRestore();
  });

  it('logs unhandled Error message and stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const err = new Error('secret db failure');
    logApiError(err);
    expect(spy).toHaveBeenCalledWith('[api] unhandled error:', 'secret db failure', err.stack);
    spy.mockRestore();
  });
});
