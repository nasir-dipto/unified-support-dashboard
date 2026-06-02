import { describe, expect, it } from 'vitest';
import {
  adfToPlainText,
  mapJiraIssueToTicket,
  mapJiraPriorityName,
  mapJiraStatusName,
  mapJiraUserDisplayName,
  normalizeJiraDescription,
} from './mapIssueToTicket.js';

const sampleAdf = {
  type: 'doc',
  version: 1,
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Password reset not working' }],
    },
  ],
} as const;

const sampleAdfJson =
  '{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Password reset not working"}]}]}';

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

describe('adfToPlainText', () => {
  it('extracts text nodes from nested ADF content', () => {
    expect(adfToPlainText(sampleAdf)).toBe('Password reset not working');
  });
});

describe('normalizeJiraDescription', () => {
  it('returns plain string as-is', () => {
    expect(normalizeJiraDescription('Plain description')).toBe('Plain description');
  });

  it('parses ADF JSON string and extracts text', () => {
    expect(normalizeJiraDescription(sampleAdfJson)).toBe('Password reset not working');
  });

  it('extracts text from ADF object', () => {
    expect(normalizeJiraDescription(sampleAdf)).toBe('Password reset not working');
  });

  it('returns empty string for null or undefined', () => {
    expect(normalizeJiraDescription(null)).toBe('');
    expect(normalizeJiraDescription(undefined)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeJiraDescription('')).toBe('');
    expect(normalizeJiraDescription('   ')).toBe('');
  });

  it('decodes HTML entities in plain text descriptions', () => {
    expect(normalizeJiraDescription('Printer&nbsp;offline')).toBe('Printer offline');
  });

  it('does not alter ADF object descriptions', () => {
    expect(normalizeJiraDescription(sampleAdf)).toBe('Password reset not working');
  });
});

describe('mapJiraUserDisplayName', () => {
  it('prefers displayName over accountId and email', () => {
    expect(
      mapJiraUserDisplayName({
        accountId: '712020:4e50a99e-7546-48de-a440-938f53b23a38',
        displayName: 'Nasir Dipto',
        emailAddress: 'n@example.com',
      }),
    ).toBe('Nasir Dipto');
  });

  it('falls back to email when displayName is absent', () => {
    expect(
      mapJiraUserDisplayName({
        accountId: '712020:uuid',
        emailAddress: 'n@example.com',
      }),
    ).toBe('n@example.com');
  });

  it('returns undefined when only accountId is present', () => {
    expect(mapJiraUserDisplayName({ accountId: '712020:uuid' })).toBeUndefined();
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
          description: sampleAdf,
          priority: { name: 'High' },
          status: { name: 'Open' },
          created: '2026-02-10T08:00:00.000+0000',
          updated: '2026-02-11T09:00:00.000+0000',
          assignee: {
            accountId: '712020:4e50a99e-7546-48de-a440-938f53b23a38',
            displayName: 'Jane Agent',
          },
          reporter: { displayName: 'Bob' },
        },
      },
      nowIso: '2020-01-01T00:00:00.000Z',
    });
    expect(rec.ticketId).toBe('jira_SUP-42');
    expect(rec.externalId).toBe('SUP-42');
    expect(rec.orgId).toBe('org-1');
    expect(rec.source).toBe('jira');
    expect(rec.description).toBe('Password reset not working');
    expect(rec.priority).toBe('high');
    expect(rec.status).toBe('open');
    expect(rec.assigneeId).toBe('Jane Agent');
    expect(rec.reporterId).toBe('Bob');
    expect(rec.createdAt).toBe('2026-02-10T08:00:00.000Z');
    expect(rec.updatedAt).toBe('2026-02-11T09:00:00.000Z');
  });
});
