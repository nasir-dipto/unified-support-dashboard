import { describe, expect, it } from 'vitest';
import { buildInviteEmail } from './email-templates.js';

describe('password-reset.service', () => {
  it('invite email template includes role', () => {
    const mail = buildInviteEmail({ setupUrl: 'http://x', invitedRole: 'manager' });
    expect(mail.text).toContain('manager');
  });
});
