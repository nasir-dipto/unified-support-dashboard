import type {
  InviteUserRequest,
  InviteUserResponse,
  UsersListResponse,
} from '@usd/shared-types';
import { apiClient } from './client.js';

/**
 * Lists org users (manager read-only, super_admin).
 */
export async function fetchUsers(): Promise<UsersListResponse> {
  const { data } = await apiClient.get<UsersListResponse>('/api/users');
  return data;
}

/**
 * Invites a user by email (super_admin only).
 */
export async function inviteUser(body: InviteUserRequest): Promise<InviteUserResponse> {
  const { data } = await apiClient.post<InviteUserResponse>('/api/users/invite', body);
  return data;
}
