import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from './loadEnv.js';
import { checkEnvWarnings } from './checkEnvWarnings.js';

describe('checkEnvWarnings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetServerEnvForTests();
  });

  it('logs a warning when integration env vars are missing', () => {
    resetServerEnvForTests();
    delete process.env.JIRA_WEBHOOK_SECRET;
    delete process.env.HD_WEBHOOK_SECRET;
    delete process.env.JIRA_URL;
    delete process.env.HELPDESK_URL;
    loadServerEnv();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    checkEnvWarnings();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('JIRA_WEBHOOK_SECRET'),
    );
  });

  it('does not warn when integration env vars are set', () => {
    resetServerEnvForTests();
    process.env.JIRA_WEBHOOK_SECRET = 'secret';
    process.env.HD_WEBHOOK_SECRET = 'secret';
    process.env.JIRA_URL = 'https://example.atlassian.net';
    process.env.HELPDESK_URL = 'https://sdp.example/api/v3';
    loadServerEnv();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    checkEnvWarnings();
    expect(warn).not.toHaveBeenCalled();
  });
});
