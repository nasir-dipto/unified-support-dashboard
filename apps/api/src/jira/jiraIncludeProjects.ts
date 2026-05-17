import type { ServerEnvRefined } from '@usd/shared-types';

/**
 * Parses `JIRA_INCLUDE_PROJECTS` (comma-separated keys). Returns `null` when unset/empty = all projects.
 */
export function parseJiraIncludeProjects(raw: string | undefined): Set<string> | null {
  if (raw === undefined || raw.trim().length === 0) {
    return null;
  }
  const keys = raw
    .split(',')
    .map((part) => part.trim().toUpperCase())
    .filter((part) => part.length > 0);
  if (keys.length === 0) {
    return null;
  }
  return new Set(keys);
}

/**
 * Reads the Jira project allow-list from validated server env.
 */
export function getJiraIncludeProjectsFromEnv(
  env: Pick<ServerEnvRefined, 'JIRA_INCLUDE_PROJECTS'>,
): Set<string> | null {
  return parseJiraIncludeProjects(env.JIRA_INCLUDE_PROJECTS);
}

/**
 * Extracts the Jira project key from an issue key (e.g. `SCRUM-6` → `SCRUM`).
 */
export function extractJiraProjectKey(issueKey: string): string | null {
  const dash = issueKey.indexOf('-');
  if (dash <= 0) {
    return null;
  }
  const project = issueKey.slice(0, dash).trim();
  return project.length > 0 ? project.toUpperCase() : null;
}

/**
 * Returns true when the project should be processed (allow-list disabled or key is listed).
 */
export function isJiraProjectIncluded(
  projectKey: string,
  includeProjects: Set<string> | null,
): boolean {
  if (includeProjects === null) {
    return true;
  }
  return includeProjects.has(projectKey.toUpperCase());
}

/**
 * Returns true when an issue key's project is allowed under `JIRA_INCLUDE_PROJECTS`.
 */
export function isJiraIssueKeyIncluded(
  issueKey: string,
  includeProjects: Set<string> | null,
): boolean {
  const projectKey = extractJiraProjectKey(issueKey);
  if (projectKey === null) {
    return includeProjects === null;
  }
  return isJiraProjectIncluded(projectKey, includeProjects);
}

/**
 * Filters Jira projects to those in the allow-list (no-op when allow-list is disabled).
 */
export function filterJiraProjectsByInclude<T extends { key: string }>(
  projects: T[],
  includeProjects: Set<string> | null,
): T[] {
  if (includeProjects === null) {
    return projects;
  }
  return projects.filter((p) => isJiraProjectIncluded(p.key, includeProjects));
}
