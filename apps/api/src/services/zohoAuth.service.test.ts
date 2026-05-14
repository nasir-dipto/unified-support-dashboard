import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { getZohoAccessToken, resetZohoAuthCacheForTests } from './zohoAuth.service.js';

describe('getZohoAccessToken', () => {
  beforeEach(() => {
    resetServerEnvForTests();
    resetZohoAuthCacheForTests();
    process.env.HD_CLIENT_ID = 'cid';
    process.env.HD_CLIENT_SECRET = 'csec';
    process.env.HD_REFRESH_TOKEN = 'rtok';
    process.env.ZOHO_DOMAIN = 'zoho.uk';
    loadServerEnv();
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
    resetZohoAuthCacheForTests();
    resetServerEnvForTests();
    delete process.env.HD_CLIENT_ID;
    delete process.env.HD_CLIENT_SECRET;
    delete process.env.HD_REFRESH_TOKEN;
  });

  it('fetches token and caches until near expiry', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'tok-a', expires_in: 3600 });
    const t1 = await getZohoAccessToken();
    expect(t1).toBe('tok-a');
    const t2 = await getZohoAccessToken();
    expect(t2).toBe('tok-a');
    expect(nock.isDone()).toBe(true);
  });

  it('refetches when access token is past refresh window', async () => {
    const scope = nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'first', expires_in: 120 })
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'second', expires_in: 3600 });
    const a = await getZohoAccessToken();
    expect(a).toBe('first');
    const future = Date.now() + 130_000;
    const spy = vi.spyOn(Date, 'now').mockReturnValue(future);
    const b = await getZohoAccessToken();
    expect(b).toBe('second');
    expect(scope.isDone()).toBe(true);
    spy.mockRestore();
  });

  it('throws AppError on non-OK token response', async () => {
    nock('https://accounts.zoho.uk').post('/oauth/v2/token').reply(401, { error: 'invalid' });
    await expect(getZohoAccessToken()).rejects.toMatchObject({ code: 'ZOHO_AUTH' });
  });
});
