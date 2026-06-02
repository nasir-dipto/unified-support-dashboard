import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth.js';
import { resolveDefaultOrgId } from '../utils/default-org.js';

/**
 * Password reset form (token from email link).
 */
export function ResetPasswordView(): ReactElement {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const orgId = params.get('orgId') ?? resolveDefaultOrgId();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-extrabold text-gray-900">Reset password</h1>
        {done ? (
          <p className="mt-4 text-sm text-green-700">
            Password updated.{' '}
            <Link to="/login" className="font-semibold text-usd-indigo">
              Sign in
            </Link>
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                setError(undefined);
                try {
                  await resetPassword({ token, password, orgId });
                  setDone(true);
                } catch {
                  setError('Invalid or expired reset link.');
                }
              })();
            }}
          >
            <label className="block text-sm font-semibold text-gray-700">
              New password
              <input
                type="password"
                minLength={8}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={password}
                onChange={(ev) => {
                  setPassword(ev.target.value);
                }}
                required
              />
            </label>
            {error !== undefined ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              className="w-full rounded-lg bg-usd-indigo py-2 text-sm font-bold text-white"
            >
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
