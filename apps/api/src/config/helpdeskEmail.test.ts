import { describe, expect, it } from 'vitest';
import { isHelpdeskEmailReplyEnabled } from './helpdeskEmail.js';

describe('isHelpdeskEmailReplyEnabled', () => {
  it('returns true only when env is "true"', () => {
    expect(isHelpdeskEmailReplyEnabled({ HELPDESK_EMAIL_REPLY_ENABLED: 'true' })).toBe(true);
    expect(isHelpdeskEmailReplyEnabled({ HELPDESK_EMAIL_REPLY_ENABLED: undefined })).toBe(false);
    expect(isHelpdeskEmailReplyEnabled({ HELPDESK_EMAIL_REPLY_ENABLED: 'false' })).toBe(false);
  });
});
