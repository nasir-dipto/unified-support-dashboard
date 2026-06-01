import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import {
  buildProjectIssuesJql,
  fetchIssueComments,
  fetchIssuesByProject,
  fetchProjects,
  fetchSingleIssue,
  postComment,
  transitionIssue,
} from './jira.service.js';

describe('jira.service', () => {
  const base = 'https://acme.atlassian.net';

  beforeEach(() => {
    process.env.JIRA_URL = base;
    process.env.JIRA_EMAIL = 'me@example.com';
    process.env.JIRA_API_TOKEN = 'token';
    resetServerEnvForTests();
    loadServerEnv();
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
    delete process.env.JIRA_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
    delete process.env.JIRA_ASSIGNEE_FILTER;
    resetServerEnvForTests();
    loadServerEnv();
  });

  it('fetchProjects parses array response', async () => {
    nock(base)
      .get('/rest/api/3/project')
      .reply(200, [{ id: '1', key: 'SUP', name: 'Support' }]);
    const projects = await fetchProjects();
    expect(projects).toEqual([{ id: '1', key: 'SUP', name: 'Support' }]);
  });

  it('fetchProjects parses wrapped values response', async () => {
    nock(base)
      .get('/rest/api/3/project')
      .reply(200, { values: [{ id: '2', key: 'X', name: 'Xray' }] });
    const projects = await fetchProjects();
    expect(projects).toEqual([{ id: '2', key: 'X', name: 'Xray' }]);
  });

  it('buildProjectIssuesJql omits assignee when filter unset', () => {
    expect(buildProjectIssuesJql('TILMS')).toBe('project = TILMS ORDER BY updated DESC');
    expect(buildProjectIssuesJql('TILMS', undefined)).toBe('project = TILMS ORDER BY updated DESC');
    expect(buildProjectIssuesJql('TILMS', '   ')).toBe('project = TILMS ORDER BY updated DESC');
  });

  it('buildProjectIssuesJql adds assignee clause when filter set', () => {
    expect(buildProjectIssuesJql('TILMS', 'nasir.dipto@transperfect.com')).toBe(
      'project = TILMS AND assignee = "nasir.dipto@transperfect.com" ORDER BY updated DESC',
    );
  });

  it('buildProjectIssuesJql adds updated window for incremental sync', () => {
    expect(buildProjectIssuesJql('SPROJ', undefined, 15)).toBe(
      'project = SPROJ AND updated > -15m ORDER BY updated DESC',
    );
    expect(buildProjectIssuesJql('SPROJ', 'me@example.com', 15)).toBe(
      'project = SPROJ AND assignee = "me@example.com" AND updated > -15m ORDER BY updated DESC',
    );
  });

  it('fetchIssuesByProject posts to search/jql and returns issues', async () => {
    nock(base)
      .post('/rest/api/3/search/jql', (body: unknown) => {
        const parsed =
          typeof body === 'string' ? (JSON.parse(body) as Record<string, unknown>) : (body as Record<string, unknown>);
        return (
          parsed.jql === 'project = SUP ORDER BY updated DESC' &&
          Array.isArray(parsed.fields) &&
          parsed.maxResults === 50
        );
      })
      .reply(200, {
        issues: [{ key: 'SUP-1', fields: { summary: 'A' } }],
        total: 1,
      });
    const out = await fetchIssuesByProject('SUP');
    expect(out.issues).toHaveLength(1);
    expect(out.issues[0]?.key).toBe('SUP-1');
  });

  it('fetchIssuesByProject applies JIRA_ASSIGNEE_FILTER to JQL', async () => {
    process.env.JIRA_ASSIGNEE_FILTER = 'nasir.dipto@transperfect.com';
    resetServerEnvForTests();
    loadServerEnv();
    nock(base)
      .post('/rest/api/3/search/jql', (body: unknown) => {
        const parsed =
          typeof body === 'string' ? (JSON.parse(body) as Record<string, unknown>) : (body as Record<string, unknown>);
        return (
          parsed.jql ===
          'project = TILMS AND assignee = "nasir.dipto@transperfect.com" ORDER BY updated DESC'
        );
      })
      .reply(200, {
        issues: [{ key: 'TILMS-1', fields: { summary: 'Filtered' } }],
        total: 1,
      });
    const out = await fetchIssuesByProject('TILMS');
    expect(out.issues).toHaveLength(1);
    expect(out.issues[0]?.key).toBe('TILMS-1');
  });

  it('fetchIssuesByProject applies sinceMinutes to JQL', async () => {
    nock(base)
      .post('/rest/api/3/search/jql', (body: unknown) => {
        const parsed =
          typeof body === 'string' ? (JSON.parse(body) as Record<string, unknown>) : (body as Record<string, unknown>);
        return parsed.jql === 'project = SUP AND updated > -15m ORDER BY updated DESC';
      })
      .reply(200, {
        issues: [{ key: 'SUP-2', fields: { summary: 'Recent' } }],
        total: 1,
      });
    const out = await fetchIssuesByProject('SUP', { sinceMinutes: 15 });
    expect(out.issues).toHaveLength(1);
    expect(out.issues[0]?.key).toBe('SUP-2');
  });

  it('fetchSingleIssue returns json', async () => {
    nock(base)
      .get('/rest/api/3/issue/SUP-1')
      .query({ expand: 'renderedFields' })
      .reply(200, { key: 'SUP-1', fields: {} });
    const issue = await fetchSingleIssue('SUP-1');
    expect(issue).toMatchObject({ key: 'SUP-1' });
  });

  it('fetchIssueComments returns comments array', async () => {
    nock(base)
      .get('/rest/api/3/issue/SUP-1/comment')
      .query({ startAt: '0', maxResults: '100' })
      .reply(200, {
        comments: [{ id: '100', body: { type: 'doc', version: 1, content: [] } }],
        total: 1,
      });
    const out = await fetchIssueComments('SUP-1');
    expect(out.comments).toHaveLength(1);
    expect(out.total).toBe(1);
  });

  it('postComment posts ADF body', async () => {
    nock(base)
      .post('/rest/api/3/issue/SUP-1/comment', (body: { body?: { type?: string } }) => {
        return body.body?.type === 'doc';
      })
      .reply(201, { id: 'c1' });
    await expect(postComment('SUP-1', 'hello')).resolves.toBeUndefined();
  });

  it('transitionIssue posts transition id', async () => {
    nock(base)
      .post('/rest/api/3/issue/SUP-1/transitions', { transition: { id: '31' } })
      .reply(204);
    await expect(transitionIssue('SUP-1', '31')).resolves.toBeUndefined();
  });
});
