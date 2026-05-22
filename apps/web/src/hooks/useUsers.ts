import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InviteUserRequest } from '@usd/shared-types';
import { fetchUsers, inviteUser } from '../api/users.js';

/**
 * TanStack Query hook for org user list.
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

/**
 * Mutation to invite a user (super_admin).
 */
export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteUserRequest) => inviteUser(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
