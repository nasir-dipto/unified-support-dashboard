import { z } from 'zod';

/** USD support roles stored in DynamoDB and JWT claims. */
export const supportRoleSchema = z.enum(['technician', 'manager', 'super_admin']);

export type SupportRole = z.infer<typeof supportRoleSchema>;

export const loginRequestSchema = z.object({
  orgId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
  orgId: z.string().min(1),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  orgId: z.string().min(1),
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const acceptInviteRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  orgId: z.string().min(1),
});

export type AcceptInviteRequest = z.infer<typeof acceptInviteRequestSchema>;

export const authOkResponseSchema = z.object({
  status: z.literal('ok'),
});

export type AuthOkResponse = z.infer<typeof authOkResponseSchema>;

export const authUserPublicSchema = z.object({
  userId: z.string().min(1),
  orgId: z.string().min(1),
  email: z.string().email(),
  roles: z.array(supportRoleSchema),
});

export type AuthUserPublic = z.infer<typeof authUserPublicSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: authUserPublicSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const stubOkSchema = z.object({
  status: z.literal('ok'),
});

export type StubOk = z.infer<typeof stubOkSchema>;
