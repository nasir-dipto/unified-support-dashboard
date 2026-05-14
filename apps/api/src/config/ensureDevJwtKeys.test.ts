import { afterEach, describe, expect, it } from 'vitest';
import { ensureDevJwtKeys } from './ensureDevJwtKeys.js';

describe('ensureDevJwtKeys', () => {
  const snapshot: Record<string, string | undefined> = {};

  afterEach(() => {
    if (snapshot.NODE_ENV === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    } else {
      process.env.NODE_ENV = snapshot.NODE_ENV;
    }
    if (snapshot.JWT_PRIVATE_KEY === undefined) {
      Reflect.deleteProperty(process.env, 'JWT_PRIVATE_KEY');
    } else {
      process.env.JWT_PRIVATE_KEY = snapshot.JWT_PRIVATE_KEY;
    }
    if (snapshot.JWT_PUBLIC_KEY === undefined) {
      Reflect.deleteProperty(process.env, 'JWT_PUBLIC_KEY');
    } else {
      process.env.JWT_PUBLIC_KEY = snapshot.JWT_PUBLIC_KEY;
    }
    if (snapshot.JWT_KEY_SECRET_ARN === undefined) {
      Reflect.deleteProperty(process.env, 'JWT_KEY_SECRET_ARN');
    } else {
      process.env.JWT_KEY_SECRET_ARN = snapshot.JWT_KEY_SECRET_ARN;
    }
  });

  it('does nothing in test mode', () => {
    snapshot.NODE_ENV = process.env.NODE_ENV;
    snapshot.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
    snapshot.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
    snapshot.JWT_KEY_SECRET_ARN = process.env.JWT_KEY_SECRET_ARN;

    process.env.NODE_ENV = 'test';
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
    delete process.env.JWT_KEY_SECRET_ARN;

    ensureDevJwtKeys();

    expect(process.env.JWT_PRIVATE_KEY).toBeUndefined();
    expect(process.env.JWT_PUBLIC_KEY).toBeUndefined();
  });

  it('does nothing in production', () => {
    snapshot.NODE_ENV = process.env.NODE_ENV;
    snapshot.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
    snapshot.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
    snapshot.JWT_KEY_SECRET_ARN = process.env.JWT_KEY_SECRET_ARN;

    process.env.NODE_ENV = 'production';
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
    delete process.env.JWT_KEY_SECRET_ARN;

    ensureDevJwtKeys();

    expect(process.env.JWT_PRIVATE_KEY).toBeUndefined();
  });

  it('generates PEM keys in development when inline keys and ARN are unset', () => {
    snapshot.NODE_ENV = process.env.NODE_ENV;
    snapshot.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
    snapshot.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
    snapshot.JWT_KEY_SECRET_ARN = process.env.JWT_KEY_SECRET_ARN;

    process.env.NODE_ENV = 'development';
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
    delete process.env.JWT_KEY_SECRET_ARN;

    ensureDevJwtKeys();

    expect(process.env.JWT_PRIVATE_KEY).toContain('BEGIN PRIVATE KEY');
    expect(process.env.JWT_PUBLIC_KEY).toContain('BEGIN PUBLIC KEY');
  });

  it('does nothing when JWT_KEY_SECRET_ARN is set', () => {
    snapshot.NODE_ENV = process.env.NODE_ENV;
    snapshot.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
    snapshot.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
    snapshot.JWT_KEY_SECRET_ARN = process.env.JWT_KEY_SECRET_ARN;

    process.env.NODE_ENV = 'development';
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
    process.env.JWT_KEY_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123:secret:x';

    ensureDevJwtKeys();

    expect(process.env.JWT_PRIVATE_KEY).toBeUndefined();
    expect(process.env.JWT_PUBLIC_KEY).toBeUndefined();
  });

  it('does nothing when both inline PEMs are already non-empty', () => {
    snapshot.NODE_ENV = process.env.NODE_ENV;
    snapshot.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
    snapshot.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
    snapshot.JWT_KEY_SECRET_ARN = process.env.JWT_KEY_SECRET_ARN;

    process.env.NODE_ENV = 'development';
    process.env.JWT_PRIVATE_KEY = 'existing-private';
    process.env.JWT_PUBLIC_KEY = 'existing-public';
    delete process.env.JWT_KEY_SECRET_ARN;

    ensureDevJwtKeys();

    expect(process.env.JWT_PRIVATE_KEY).toBe('existing-private');
    expect(process.env.JWT_PUBLIC_KEY).toBe('existing-public');
  });
});
