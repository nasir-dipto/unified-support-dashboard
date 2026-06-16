import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest, type LoginResponse } from '@usd/shared-types';
import { usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { shouldShowDemoHints } from '../utils/demo-hints';
import { resolveDefaultOrgId } from '../utils/default-org';
import { resolveLoginErrorMessage } from '../utils/login-error';
import { getHomePathForRoles } from '../utils/roles';

/**
 * Sign-in screen matching design reference (real auth API).
 */
export function LoginView(): ReactElement {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPass, setShowPass] = useState(false);
  const orgId = resolveDefaultOrgId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { orgId, email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { data } = await apiClient.post<LoginResponse>('/api/auth/login', values);
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate(getHomePathForRoles(), { replace: true });
    } catch (e: unknown) {
      setFormError('root', { message: resolveLoginErrorMessage(e) });
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-extrabold text-white"
            style={{ backgroundColor: usdColors.indigo }}
          >
            UD
          </div>
          <div>
            <div className="text-xl font-extrabold text-gray-900">UnifyDesk</div>
            <div className="text-sm font-medium text-gray-500">Unified Support Dashboard</div>
            <p className="text-sm text-gray-400">Sign in to your account</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="rounded-2xl border border-gray-200 bg-white px-8 py-7 shadow-lg"
        >
          <input type="hidden" {...register('orgId')} />
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-bold text-gray-700" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-usd-indigo ${
                errors.email !== undefined || errors.root !== undefined
                  ? 'border-usd-red'
                  : 'border-gray-200'
              }`}
              {...register('email')}
            />
          </div>
          <div className="mb-2">
            <label className="mb-1.5 block text-[13px] font-bold text-gray-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                className={`w-full rounded-lg border py-2.5 pl-3.5 pr-12 text-sm outline-none focus:border-usd-indigo ${
                  errors.password !== undefined || errors.root !== undefined
                    ? 'border-usd-red'
                    : 'border-gray-200'
                }`}
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400"
                onClick={() => { setShowPass((s) => !s); }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {errors.root !== undefined ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-usd-red" role="alert">
              {errors.root.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg py-2.5 text-[15px] font-bold text-white disabled:opacity-70"
            style={{ backgroundColor: usdColors.indigo }}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="mt-4 text-center text-sm">
            <Link to="/forgot-password" className="font-semibold text-usd-indigo">
              Forgot password?
            </Link>
          </p>
          {shouldShowDemoHints() ? (
            <div className="mt-5 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
              <p className="mb-2 font-bold text-gray-700">Demo credentials</p>
              <ul className="space-y-1 text-left">
                <li>
                  <span className="font-semibold">Super Admin:</span> admin@usd.dev / Admin123!
                </li>
                <li>
                  <span className="font-semibold">Manager:</span> manager@usd.dev / Mgr123!
                </li>
                <li>
                  <span className="font-semibold">Technician:</span> technician@usd.dev / Tech123!
                </li>
              </ul>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
