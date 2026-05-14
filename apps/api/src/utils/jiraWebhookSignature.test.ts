import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertValidHubSignature256 } from './jiraWebhookSignature.js';
import { AppError } from './errors.js';

describe('assertValidHubSignature256', () => {
  it('accepts a valid sha256 signature', () => {
    const secret = 's3cret';
    const raw = Buffer.from('{"hello":1}', 'utf8');
    const digest = createHmac('sha256', secret).update(raw).digest('hex');
    expect(() => {
      assertValidHubSignature256(raw, `sha256=${digest}`, secret);
    }).not.toThrow();
  });

  it('rejects wrong signature', () => {
    const raw = Buffer.from('{}', 'utf8');
    expect(() => {
      assertValidHubSignature256(raw, 'sha256=deadbeef', 'secret');
    }).toThrow(AppError);
  });

  it('rejects missing header', () => {
    expect(() => {
      assertValidHubSignature256(Buffer.from('x'), undefined, 's');
    }).toThrow(AppError);
  });
});
