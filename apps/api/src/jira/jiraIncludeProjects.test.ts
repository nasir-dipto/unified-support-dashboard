import { describe, expect, it } from 'vitest';
import {
  extractJiraProjectKey,
  filterJiraProjectsByInclude,
  isJiraIssueKeyIncluded,
  parseJiraIncludeProjects,
} from './jiraIncludeProjects.js';

describe('jiraIncludeProjects', () => {
  it('parseJiraIncludeProjects returns null when unset or empty', () => {
    expect(parseJiraIncludeProjects(undefined)).toBeNull();
    expect(parseJiraIncludeProjects('')).toBeNull();
    expect(parseJiraIncludeProjects('  ,  ')).toBeNull();
  });

  it('parseJiraIncludeProjects normalizes keys', () => {
    const set = parseJiraIncludeProjects('scrum, TPDI ,TRL');
    expect(set).not.toBeNull();
    expect(set?.has('SCRUM')).toBe(true);
    expect(set?.has('TPDI')).toBe(true);
    expect(set?.has('TRL')).toBe(true);
  });

  it('extractJiraProjectKey parses standard keys', () => {
    expect(extractJiraProjectKey('SCRUM-6')).toBe('SCRUM');
    expect(extractJiraProjectKey('TPDI-1042')).toBe('TPDI');
  });

  it('isJiraIssueKeyIncluded respects allow-list', () => {
    const allowed = parseJiraIncludeProjects('SCRUM,TPDI');
    expect(isJiraIssueKeyIncluded('SCRUM-1', allowed)).toBe(true);
    expect(isJiraIssueKeyIncluded('TRL-1', allowed)).toBe(false);
    expect(isJiraIssueKeyIncluded('TRL-1', null)).toBe(true);
  });

  it('filterJiraProjectsByInclude keeps only listed projects', () => {
    const projects = [{ key: 'SCRUM' }, { key: 'TRL' }, { key: 'TPDI' }];
    const allowed = parseJiraIncludeProjects('SCRUM,TPDI');
    const filtered = filterJiraProjectsByInclude(projects, allowed);
    expect(filtered.map((p) => p.key)).toEqual(['SCRUM', 'TPDI']);
  });
});
