import type {
  AcceptInviteRequest,
  AuthOkResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@usd/shared-types';
import { apiClient } from './client.js';

/**
 * Requests a password reset email.
 */
export async function forgotPassword(body: ForgotPasswordRequest): Promise<AuthOkResponse> {
  const { data } = await apiClient.post<AuthOkResponse>('/api/auth/forgot-password', body);
  return data;
}

/**
 * Resets password with a one-time token.
 */
export async function resetPassword(body: ResetPasswordRequest): Promise<AuthOkResponse> {
  const { data } = await apiClient.post<AuthOkResponse>('/api/auth/reset-password', body);
  return data;
}

/**
 * Accepts an invite and sets the initial password.
 */
export async function acceptInvite(body: AcceptInviteRequest): Promise<AuthOkResponse> {
  const { data } = await apiClient.post<AuthOkResponse>('/api/auth/accept-invite', body);
  return data;
}
