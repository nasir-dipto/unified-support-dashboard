import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth.js';
import { resolveDefaultOrgId } from '../utils/default-org.js';

/**
 * Self-service forgot password form.
 */
export function ForgotPasswordView(): ReactElement {
  const orgId = resolveDefaultOrgId();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-extrabold text-gray-900">Forgot password</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter your email. If an account exists, we will send a reset link.
        </p>
        {sent ? (
          <p className="mt-4 text-sm text-green-700">Check your email for a reset link.</p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                setError(undefined);
                try {
                  await forgotPassword({ orgId, email });
                  setSent(true);
                } catch {
                  setError('Unable to send reset email. Check SMTP settings.');
                }
              })();
            }}
          >
            <label className="block text-sm font-semibold text-gray-700">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={email}
                onChange={(ev) => {
                  setEmail(ev.target.value);
                }}
                required
              />
            </label>
            {error !== undefined ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              className="w-full rounded-lg bg-usd-indigo py-2 text-sm font-bold text-white"
            >
              Send reset link
            </button>
          </form>
        )}
        <Link to="/login" className="mt-4 block text-center text-sm text-usd-indigo">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
