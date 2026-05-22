/**
 * Builds invite email subject and body with setup link.
 */
export function buildInviteEmail(params: {
  setupUrl: string;
  invitedRole: string;
}): { subject: string; text: string; html: string } {
  const subject = 'You are invited to Unified Support Dashboard';
  const text = [
    'You have been invited to Unified Support Dashboard.',
    `Role: ${params.invitedRole}`,
    '',
    `Set your password (expires in 24 hours): ${params.setupUrl}`,
  ].join('\n');
  const html = `<p>You have been invited to Unified Support Dashboard.</p><p>Role: <strong>${params.invitedRole}</strong></p><p><a href="${params.setupUrl}">Set your password</a> (expires in 24 hours).</p>`;
  return { subject, text, html };
}

/**
 * Builds password reset email subject and body.
 */
export function buildPasswordResetEmail(params: {
  resetUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = 'Reset your Unified Support Dashboard password';
  const text = `Reset your password (expires in 24 hours): ${params.resetUrl}`;
  const html = `<p><a href="${params.resetUrl}">Reset your password</a> (expires in 24 hours).</p>`;
  return { subject, text, html };
}
