import { z } from 'zod';
import { supportRoleSchema } from '../auth/schemas.js';

/** Org member row for GET /api/users. */
export const orgUserSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  role: supportRoleSchema,
  createdAt: z.string().min(1),
});

export type OrgUser = z.infer<typeof orgUserSchema>;

export const usersListResponseSchema = z.object({
  data: z.array(orgUserSchema),
  total: z.number().int().nonnegative(),
});

export type UsersListResponse = z.infer<typeof usersListResponseSchema>;

export const inviteUserRequestSchema = z.object({
  email: z.string().email(),
  role: supportRoleSchema,
});

export type InviteUserRequest = z.infer<typeof inviteUserRequestSchema>;

export const inviteUserResponseSchema = z.object({
  status: z.literal('ok'),
  email: z.string().email(),
});

export type InviteUserResponse = z.infer<typeof inviteUserResponseSchema>;
