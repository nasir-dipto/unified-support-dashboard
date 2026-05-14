import { describe, expect, it } from 'vitest';
import {
  mapJiraIssueToTicket,
  mapJiraPriorityName,
  mapJiraStatusName,
  normalizeJiraDescription,
} from './mapIssueToTicket.js';

describe('mapJiraPriorityName', () => {
  it('maps highest to critical', () => {
    expect(mapJiraPriorityName('Highest')).toBe('critical');
  });
  it('defaults unknown to medium', () => {
    expect(mapJiraPriorityName(undefined)).toBe('medium');
  });
});

describe('mapJiraStatusName', () => {
  it('maps done to closed', () => {
    expect(mapJiraStatusName('Done')).toBe('closed');
  });
  it('maps in progress', () => {
    expect(mapJiraStatusName('In Progress')).toBe('in_progress');
  });
});

describe('normalizeJiraDescription', () => {
  it('returns string as-is', () => {
    expect(normalizeJiraDescription('x')).toBe('x');
  });
  it('stringifies objects', () => {
    expect(normalizeJiraDescription({ type: 'doc' })).toBe('{"type":"doc"}');
  });
});

describe('mapJiraIssueToTicket', () => {
  it('builds jira ticket id and fields', () => {
    const rec = mapJiraIssueToTicket({
      orgId: 'org-1',
      issue: {
        key: 'SUP-42',
        fields: {
          summary: 'Hello',
          priority: { name: 'High' },
          status: { name: 'Open' },
          assignee: { accountId: 'acc1' },
          reporter: { displayName: 'Bob' },
        },
      },
      nowIso: '2020-01-01T00:00:00.000Z',
    });
    expect(rec.ticketId).toBe('jira_SUP-42');
    expect(rec.externalId).toBe('SUP-42');
    expect(rec.orgId).toBe('org-1');
    expect(rec.source).toBe('jira');
    expect(rec.priority).toBe('high');
    expect(rec.status).toBe('open');
    expect(rec.assigneeId).toBe('acc1');
    expect(rec.reporterId).toBe('Bob');
  });
});
