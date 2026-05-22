import { describe, expect, it } from 'vitest';
import { buildInviteEmail, buildPasswordResetEmail } from './email-templates.js';

describe('email-templates', () => {
  it('builds invite email with setup url', () => {
    const out = buildInviteEmail({ setupUrl: 'http://localhost/accept', invitedRole: 'technician' });
    expect(out.text).toContain('http://localhost/accept');
    expect(out.subject).toContain('invited');
  });

  it('builds password reset email', () => {
    const out = buildPasswordResetEmail({ resetUrl: 'http://localhost/reset' });
    expect(out.text).toContain('http://localhost/reset');
  });
});
