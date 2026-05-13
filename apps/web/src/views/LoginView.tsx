import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest, type LoginResponse } from '@usd/shared-types';
import axios from 'axios';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';

const defaultOrg =
  import.meta.env.VITE_DEFAULT_ORG_ID !== undefined &&
  import.meta.env.VITE_DEFAULT_ORG_ID.length > 0
    ? import.meta.env.VITE_DEFAULT_ORG_ID
    : 'demo-org';

/**
 * Email + password sign-in for a single organization.
 */
export function LoginView(): ReactElement {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { orgId: defaultOrg, email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { data } = await apiClient.post<LoginResponse>('/api/auth/login', values);
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate('/', { replace: true });
    } catch (e: unknown) {
      let msg = 'Unable to sign in';
      if (
        axios.isAxiosError(e) &&
        e.response?.data !== undefined &&
        typeof e.response.data === 'object' &&
        e.response.data !== null &&
        'error' in e.response.data
      ) {
        const body = e.response.data as { error?: unknown };
        if (typeof body.error === 'string') {
          msg = body.error;
        }
      }
      setFormError('root', { message: msg });
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={(e) => {
          void onSubmit(e);
        }}
        className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        {errors.root !== undefined ? (
          <p className="text-sm text-red-600" role="alert">
            {errors.root.message}
          </p>
        ) : null}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="orgId">
            Organization ID
          </label>
          <input
            id="orgId"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
            {...register('orgId')}
          />
          {errors.orgId !== undefined ? (
            <p className="text-xs text-red-600">{errors.orgId.message}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
            {...register('email')}
          />
          {errors.email !== undefined ? (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
            {...register('password')}
          />
          {errors.password !== undefined ? (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
