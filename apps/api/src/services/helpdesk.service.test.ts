import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { resetZohoAuthCacheForTests } from './zohoAuth.service.js';
import { AppError } from '../utils/errors.js';
import * as helpdeskService from './helpdesk.service.js';
import {
  buildConversationsListInputData,
  buildCustomerEmailReplySubject,
  wrapEmailReplyDescription,
  buildNotesListInputData,
  buildRequestsListInputData,
  fetchRequestConversations,
  fetchRequestNotification,
  fetchRequestNotes,
  fetchRequestsPage,
  helpdeskFetch,
  helpdeskFetchWithBackoff,
  helpdeskApiV3Base,
  mergeNotificationIntoConversationRow,
  parseHelpdeskNotificationResponse,
  postComment,
  postCustomerEmailReply,
  REQUEST_LIST_FIELDS_REQUIRED,
} from './helpdesk.service.js';

/**
 * Reads SDP `input_data` from a nock POST body (form-urlencoded).
 */
function parseInputDataFromNockBody(body: unknown): unknown {
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
    return null;
  }
  return JSON.parse(rawInput) as unknown;
}

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

  it('buildRequestsListInputData adds last_updated_time search for incremental sync', () => {
    const nowMs = 1_700_000_000_000;
    const decoded = decodeURIComponent(buildRequestsListInputData(50, 1, { sinceMinutes: 15, nowMs }));
    const parsed = JSON.parse(decoded) as {
      list_info: {
        search_criteria?: { field: string; condition: string; value: string };
      };
    };
    expect(parsed.list_info.search_criteria).toEqual({
      field: 'last_updated_time',
      condition: 'greater than',
      value: String(nowMs - 15 * 60 * 1000),
    });
  });

  it('buildRequestsListInputData adds technician.name filter when technicianName set', () => {
    const decoded = decodeURIComponent(
      buildRequestsListInputData(10, 1, { technicianName: 'Nasir Dipto' }),
    );
    const parsed = JSON.parse(decoded) as {
      list_info: {
        search_criteria?: { field: string; condition: string; value: string };
      };
    };
    expect(parsed.list_info.search_criteria).toEqual({
      field: 'technician.name',
      condition: 'is',
      value: 'Nasir Dipto',
    });
  });

  it('buildRequestsListInputData uses search_criteria array when sinceMinutes and technicianName set', () => {
    const nowMs = 1_700_000_000_000;
    const decoded = decodeURIComponent(
      buildRequestsListInputData(10, 1, {
        sinceMinutes: 15,
        technicianName: 'Nasir Dipto',
        nowMs,
      }),
    );
    const parsed = JSON.parse(decoded) as {
      list_info: {
        search_criteria?: Array<{ field: string; condition: string; value: string }>;
      };
    };
    expect(parsed.list_info.search_criteria).toEqual([
      {
        field: 'last_updated_time',
        condition: 'greater than',
        value: String(nowMs - 15 * 60 * 1000),
      },
      {
        field: 'technician.name',
        condition: 'is',
        value: 'Nasir Dipto',
      },
    ]);
  });

  it('buildRequestsListInputData omits search_criteria without filters', () => {
    const decoded = decodeURIComponent(buildRequestsListInputData(5, 1));
    const parsed = JSON.parse(decoded) as {
      list_info: { search_criteria?: unknown };
    };
    expect(parsed.list_info.search_criteria).toBeUndefined();
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

  it('fetchRequestsPage passes sinceMinutes to input_data', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 't3', expires_in: 3600 });
    const nowMs = 1_700_000_000_000;
    const expectedInput = buildRequestsListInputData(5, 1, { sinceMinutes: 15, nowMs });
    nock('https://sdp.example')
      .get(`/api/v3/requests?input_data=${expectedInput}`)
      .reply(200, {
        requests: [{ id: '2', subject: 'Recent' }],
        list_info: { has_more_rows: false },
      });
    const out = await fetchRequestsPage({ rowCount: 5, startIndex: 1, sinceMinutes: 15, nowMs });
    expect(out.requests).toHaveLength(1);
    expect(out.requests[0]?.subject).toBe('Recent');
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
    nock('https://sdp.example')
      .get('/api/v3/requests/4445000000000077/notifications/9')
      .reply(404, { message: 'not found' });
    const out = await fetchRequestConversations('4445000000000077');
    expect(out.conversations).toHaveLength(1);
  });

  it('parseHelpdeskNotificationResponse unwraps notification object', () => {
    const parsed = parseHelpdeskNotificationResponse({
      notification: {
        id: '77',
        description: '<p>Email body</p>',
        subject: 'Help',
        type: 'EMAIL',
      },
    });
    expect(parsed?.description).toBe('<p>Email body</p>');
    expect(parsed?.subject).toBe('Help');
  });

  it('mergeNotificationIntoConversationRow copies description and sender', () => {
    const merged = mergeNotificationIntoConversationRow(
      { id: '77', type: 'EMAIL' },
      {
        description: '<p>Hi</p>',
        subject: 'Re: issue',
        sender: { name: 'Customer', email_id: 'c@co.com' },
        created_time: '2026-03-01T10:00:00Z',
      },
    );
    expect(merged.description).toBe('<p>Hi</p>');
    expect(merged.subject).toBe('Re: issue');
    expect(merged.sender).toEqual({ name: 'Customer', email_id: 'c@co.com' });
    expect(merged.created_time).toBe('2026-03-01T10:00:00Z');
  });

  it('fetchRequestNotification returns null on API error', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'notif-tok', expires_in: 3600 });
    nock('https://sdp.example')
      .get('/api/v3/requests/4445000000000077/notifications/missing')
      .reply(404, { message: 'not found' });
    const out = await fetchRequestNotification('4445000000000077', 'missing');
    expect(out).toBeNull();
  });

  it('fetchRequestConversations hydrates EMAIL rows from notifications API', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .times(2)
      .reply(200, { access_token: 'hydrate-tok', expires_in: 3600 });
    const inputData = buildConversationsListInputData(50);
    nock('https://sdp.example')
      .get(`/api/v3/requests/4445000000000077/conversations?input_data=${inputData}`)
      .reply(200, {
        conversations: [{ id: '88', type: 'EMAIL', created_time: '2026-03-01T09:00:00Z' }],
      });
    nock('https://sdp.example')
      .get('/api/v3/requests/4445000000000077/notifications/88')
      .reply(200, {
        notification: {
          id: '88',
          type: 'EMAIL',
          subject: 'Printer offline',
          description: '<p>Please reset the device.</p>',
          sender: { name: 'Alex', email_id: 'alex@co.com' },
          created_time: '2026-03-01T09:05:00Z',
        },
      });
    const out = await fetchRequestConversations('4445000000000077');
    expect(out.conversations[0]?.description).toBe('<p>Please reset the device.</p>');
    expect(out.conversations[0]?.subject).toBe('Printer offline');
    expect(out.conversations[0]?.sender).toEqual({ name: 'Alex', email_id: 'alex@co.com' });
  });

  it('fetchRequestConversations hydrates RequesterAck_E-Mail notification types', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .times(2)
      .reply(200, { access_token: 'ack-tok', expires_in: 3600 });
    const inputData = buildConversationsListInputData(50);
    nock('https://sdp.example')
      .get(`/api/v3/requests/4445000000000077/conversations?input_data=${inputData}`)
      .reply(200, {
        conversations: [{ id: '91', type: 'RequesterAck_E-Mail' }],
      });
    nock('https://sdp.example')
      .get('/api/v3/requests/4445000000000077/notifications/91')
      .reply(200, {
        notification: {
          id: '91',
          type: 'RequesterAck_E-Mail',
          description: 'Your request has been logged.',
        },
      });
    const out = await fetchRequestConversations('4445000000000077');
    expect(out.conversations[0]?.description).toBe('Your request has been logged.');
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

  it('buildCustomerEmailReplySubject formats ManageEngine reply subject', () => {
    expect(buildCustomerEmailReplySubject('187438', 'VPN access issue')).toBe(
      'Re: [Request ID :##187438##] : VPN access issue',
    );
    expect(buildCustomerEmailReplySubject('187438')).toBe('Re: [Request ID :##187438##]');
  });

  it('wrapEmailReplyDescription wraps plain text in a paragraph', () => {
    expect(wrapEmailReplyDescription('Hello customer')).toBe('<p>Hello customer</p>');
    expect(wrapEmailReplyDescription('line one\nline two')).toBe(
      '<p>line one<br/>line two</p>',
    );
  });

  it('wrapEmailReplyDescription preserves safe HTML and strips dangerous content', () => {
    const safe = '<p>Hi <strong>there</strong></p><ul><li>one</li></ul>';
    expect(wrapEmailReplyDescription(safe)).toBe(safe);

    const dangerous =
      '<p onclick="alert(1)">Hi</p><script>alert("xss")</script><a href="javascript:alert(1)">bad</a>';
    const sanitized = wrapEmailReplyDescription(dangerous);
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('<p>Hi</p>');
  });

  it('helpdeskApiV3Base strips /app/<portal> from HELPDESK_URL', () => {
    resetServerEnvForTests();
    process.env.HELPDESK_URL =
      'https://transperfect.sdpondemand.manageengine.com/app/itdesk/api/v3';
    loadServerEnv();
    expect(helpdeskApiV3Base()).toBe(
      'https://transperfect.sdpondemand.manageengine.com/api/v3',
    );
    resetServerEnvForTests();
    process.env.HELPDESK_URL = 'https://sdp.example/api/v3';
    loadServerEnv();
  });

  it('helpdeskApiV3Base leaves bare /api/v3 URL unchanged', () => {
    expect(helpdeskApiV3Base()).toBe('https://sdp.example/api/v3');
  });

  it('postCustomerEmailReply posts notification to bare /api/v3 base', async () => {
    resetServerEnvForTests();
    process.env.HELPDESK_URL =
      'https://transperfect.sdpondemand.manageengine.com/app/itdesk/api/v3';
    loadServerEnv();
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'reply-tok', expires_in: 3600 });
    nock('https://transperfect.sdpondemand.manageengine.com')
      .post('/api/v3/requests/4445000000000077/notifications', (body: unknown) => {
        const parsed = parseInputDataFromNockBody(body) as {
          notification?: {
            to?: string[];
            subject?: string;
            description?: string;
            in_reply_to?: { id?: string };
            type?: string;
          };
        };
        const n = parsed.notification;
        if (n === undefined) {
          return false;
        }
        return (
          n.to === undefined &&
          n.subject === 'Re: [Request ID :##187438##] : VPN access issue' &&
          n.description === '<p>email body</p>' &&
          n.in_reply_to?.id === '4445000000000077' &&
          n.type === 'CONVERSATION'
        );
      })
      .matchHeader('content-type', /application\/x-www-form-urlencoded/)
      .matchHeader('accept', 'application/vnd.manageengine.sdp.v3+json')
      .reply(200, {
        response_status: { status_code: 2000, status: 'success' },
      });
    await postCustomerEmailReply(
      {
        externalId: '187438',
        internalId: '4445000000000077',
        subject: 'VPN access issue',
      },
      'email body',
    );
    expect(nock.isDone()).toBe(true);
  });

  it('postCustomerEmailReply throws when internalId is missing', async () => {
    await expect(
      postCustomerEmailReply(
        { externalId: '77', customerEmail: 'customer@example.com' },
        'body',
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
      statusCode: 400,
    });
  });

  it('postCustomerEmailReply succeeds without customerEmail (in_reply_to addresses requester)', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'reply-tok', expires_in: 3600 });
    nock('https://sdp.example')
      .post('/api/v3/requests/4445000000000077/notifications')
      .reply(200, {
        response_status: { status_code: 2000, status: 'success' },
      });
    await postCustomerEmailReply(
      { externalId: '187438', internalId: '4445000000000077', subject: 'VPN access issue' },
      'body',
    );
    expect(nock.isDone()).toBe(true);
  });

  it('postCustomerEmailReply throws when SDP response_status is not 2000', async () => {
    nock('https://accounts.zoho.uk')
      .post('/oauth/v2/token')
      .reply(200, { access_token: 'reply-tok', expires_in: 3600 });
    nock('https://sdp.example')
      .post('/api/v3/requests/4445000000000077/notifications')
      .reply(200, {
        response_status: {
          status_code: 4000,
          messages: [{ message: 'Invalid recipient' }],
        },
      });
    await expect(
      postCustomerEmailReply(
        {
          externalId: '187438',
          internalId: '4445000000000077',
        },
        'body',
      ),
    ).rejects.toMatchObject({
      code: 'HELPDESK_API',
      message: 'Invalid recipient',
    });
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
