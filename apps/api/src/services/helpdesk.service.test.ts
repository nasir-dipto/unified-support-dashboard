import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { resetZohoAuthCacheForTests } from './zohoAuth.service.js';
import { AppError } from '../utils/errors.js';
import * as helpdeskService from './helpdesk.service.js';
import {
  buildConversationsListInputData,
  buildNotesListInputData,
  buildRequestsListInputData,
  fetchRequestConversations,
  fetchRequestNotes,
  fetchRequestsPage,
  helpdeskFetch,
  helpdeskFetchWithBackoff,
  postComment,
  postCustomerEmailReply,
  REQUEST_LIST_FIELDS_REQUIRED,
} from './helpdesk.service.js';

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

  it('buildRequestsListInputData requests description and mapping fields', () => {
    const decoded = decodeURIComponent(buildRequestsListInputData(5, 1));
    const parsed = JSON.parse(decoded) as {
      list_info: { fields_required: string[] };
    };
    expect(parsed.list_info.fields_required).toEqual([...REQUEST_LIST_FIELDS_REQUIRED]);
    expect(parsed.list_info.fields_required).toContain('description');
  });

  it('fetchRequestsPage parses requests array', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 't2', expires_in: 3600 });
    const expectedInput = buildRequestsListInputData(5, 1);
    nock('https://sdp.example')
      .get(`/api/v3/requests?input_data=${expectedInput}`)
      .matchHeader('accept', 'application/vnd.manageengine.sdp.v3+json')
      .matchHeader('authorization', 'Zoho-oauthtoken t2')
      .reply(200, {
        requests: [{ id: '1', subject: 'A', description: 'Details here' }],
        list_info: { has_more_rows: false },
      });
    const out = await fetchRequestsPage({ rowCount: 5, startIndex: 1 });
    expect(out.requests).toHaveLength(1);
    expect(out.requests[0]?.subject).toBe('A');
    expect(out.requests[0]?.description).toBe('Details here');
    expect(out.hasMore).toBe(false);
  });

  it('buildConversationsListInputData requests conversation metadata fields', () => {
    const parsed = JSON.parse(decodeURIComponent(buildConversationsListInputData(25))) as {
      list_info: { fields_required: string[] };
    };
    expect(parsed.list_info.fields_required).toContain('type');
    expect(parsed.list_info.fields_required).not.toContain('description');
  });

  it('fetchRequestConversations parses conversations array', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'conv-tok', expires_in: 3600 });
    const inputData = buildConversationsListInputData(50);
    nock('https://sdp.example')
      .get(`/api/v3/requests/4445000000000077/conversations?input_data=${inputData}`)
      .reply(200, {
        conversations: [{ id: '9', type: 'NOTES' }],
      });
    const out = await fetchRequestConversations('4445000000000077');
    expect(out.conversations).toHaveLength(1);
  });

  it('fetchRequestNotes parses notes array with description', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'notes-tok', expires_in: 3600 });
    const inputData = buildNotesListInputData(50);
    const parsed = JSON.parse(decodeURIComponent(inputData)) as {
      list_info: { fields_required: string[] };
    };
    expect(parsed.list_info.fields_required).toContain('description');
    nock('https://sdp.example')
      .get(`/api/v3/requests/4445000000000077/notes?input_data=${inputData}`)
      .reply(200, {
        notes: [{ id: '9', description: 'hello-note' }],
      });
    const out = await fetchRequestNotes('4445000000000077');
    expect(out.notes).toHaveLength(1);
    expect(out.notes[0]?.description).toBe('hello-note');
  });

  it('postCustomerEmailReply posts to /reply', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'reply-tok', expires_in: 3600 });
    nock('https://sdp.example')
      .post('/api/v3/requests/4445000000000077/reply')
      .matchHeader('content-type', /application\/x-www-form-urlencoded/)
      .reply(200, { status: 'ok' });
    await postCustomerEmailReply(
      { externalId: '77', internalId: '4445000000000077' },
      'email body',
    );
    expect(nock.isDone()).toBe(true);
  });

  it('postComment submits input_data as x-www-form-urlencoded', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'note-tok', expires_in: 3600 });
    nock('https://sdp.example')
      .post('/api/v3/requests/4445000000000077/notes', (body: unknown) => {
        let rawInput: string | null = null;
        if (typeof body === 'string') {
          rawInput = new URLSearchParams(body).get('input_data');
        } else if (typeof body === 'object' && body !== null && 'input_data' in body) {
          const v = (body as { input_data?: unknown }).input_data;
          rawInput = typeof v === 'string' ? v : null;
        } else if (Buffer.isBuffer(body)) {
          rawInput = new URLSearchParams(body.toString('utf8')).get('input_data');
        }
        if (rawInput === null) {
          return false;
        }
        const parsed = JSON.parse(rawInput) as {
          request_note?: { description?: string };
          note?: { description?: string };
        };
        const rn = parsed.request_note;
        if (rn === undefined) {
          return false;
        }
        return rn.description === 'hello-note' && !('note' in parsed);
      })
      .matchHeader('content-type', /application\/x-www-form-urlencoded/)
      .reply(200, { status: 'ok' });
    await postComment({ externalId: '77', internalId: '4445000000000077' }, 'hello-note');
    expect(nock.isDone()).toBe(true);
  });

  it('helpdeskFetchWithBackoff retries on 429 then succeeds', async () => {
    vi.spyOn(helpdeskService, 'sleep').mockResolvedValue(undefined);
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'retry-tok', expires_in: 3600 });
    nock('https://sdp.example')
      .get('/api/v3/requests/99')
      .reply(429, { message: 'rate limited' })
      .get('/api/v3/requests/99')
      .reply(200, { request: { id: '99' } });
    const res = await helpdeskFetchWithBackoff('/requests/99');
    expect(res.status).toBe(200);
  });

  it('helpdeskFetchWithBackoff does not retry on 404', async () => {
    vi.spyOn(helpdeskService, 'sleep').mockResolvedValue(undefined);
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: '404-tok', expires_in: 3600 });
    const scope = nock('https://sdp.example').get('/api/v3/requests/missing').reply(404, 'not found');
    await expect(helpdeskFetchWithBackoff('/requests/missing')).rejects.toBeInstanceOf(AppError);
    expect(scope.isDone()).toBe(true);
  });

  it('helpdeskFetchWithBackoff does not retry on 500', async () => {
    vi.spyOn(helpdeskService, 'sleep').mockResolvedValue(undefined);
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: '500-tok', expires_in: 3600 });
    const scope = nock('https://sdp.example').get('/api/v3/requests/broken').reply(500, 'server error');
    await expect(helpdeskFetchWithBackoff('/requests/broken')).rejects.toBeInstanceOf(AppError);
    expect(scope.isDone()).toBe(true);
  });

  it('postComment falls back to externalId when internalId is absent', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'note-tok2', expires_in: 3600 });
    nock('https://sdp.example')
      .post('/api/v3/requests/88/notes')
      .reply(200, { status: 'ok' });
    await postComment({ externalId: '88' }, 'short-path');
    expect(nock.isDone()).toBe(true);
  });
});
