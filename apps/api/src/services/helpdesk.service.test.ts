import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { resetZohoAuthCacheForTests } from './zohoAuth.service.js';
import { fetchRequestsPage, helpdeskFetch } from './helpdesk.service.js';

describe('helpdesk.service', () => {
  beforeEach(() => {
    resetServerEnvForTests();
    resetZohoAuthCacheForTests();
    process.env.HELPDESK_URL = 'https://sdp.example/api/v3';
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
    delete process.env.HELPDESK_URL;
    delete process.env.HD_CLIENT_ID;
    delete process.env.HD_CLIENT_SECRET;
    delete process.env.HD_REFRESH_TOKEN;
  });

  it('helpdeskFetch attaches Zoho-oauthtoken', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'hd-tok', expires_in: 3600 });
    nock('https://sdp.example')
      .get('/api/v3/requests/42')
      .matchHeader('accept', 'application/vnd.manageengine.sdp.v3+json')
      .matchHeader('authorization', 'Zoho-oauthtoken hd-tok')
      .reply(200, { request: { id: '42' } });
    const res = await helpdeskFetch('/requests/42');
    const json = (await res.json()) as { request: { id: string } };
    expect(json.request.id).toBe('42');
  });

  it('fetchRequestsPage parses requests array', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 't2', expires_in: 3600 });
    const expectedInput = encodeURIComponent(
      JSON.stringify({
        list_info: { row_count: 5, start_index: 1 },
      }),
    );
    nock('https://sdp.example')
      .get(`/api/v3/requests?input_data=${expectedInput}`)
      .matchHeader('accept', 'application/vnd.manageengine.sdp.v3+json')
      .matchHeader('authorization', 'Zoho-oauthtoken t2')
      .reply(200, {
        requests: [{ id: '1', subject: 'A' }],
        list_info: { has_more_rows: false },
      });
    const out = await fetchRequestsPage({ rowCount: 5, startIndex: 1 });
    expect(out.requests).toHaveLength(1);
    expect(out.requests[0]?.subject).toBe('A');
    expect(out.hasMore).toBe(false);
  });
});
