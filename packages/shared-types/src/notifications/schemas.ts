import { z } from 'zod';

/** In-app / email notification kinds. */
export const notificationTypeSchema = z.enum([
  'sla_breach',
  'critical_ticket',
  'churn_risk',
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

/** Stored notification record in `support_notifications`. */
export const notificationRecordSchema = z.object({
  notificationId: z.string().min(1),
  orgId: z.string().min(1),
  type: notificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  ticketId: z.string().min(1).optional(),
  recipientUserId: z.string().min(1).optional(),
  recipientEmail: z.string().email().optional(),
  readAt: z.string().min(1).nullable().optional(),
  createdAt: z.string().min(1),
});

export type NotificationRecord = z.infer<typeof notificationRecordSchema>;

export const notificationApiDtoSchema = notificationRecordSchema;

export type NotificationApiDto = z.infer<typeof notificationApiDtoSchema>;

export const notificationsListResponseSchema = z.object({
  data: z.array(notificationApiDtoSchema),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationsListResponse = z.infer<typeof notificationsListResponseSchema>;

export const markNotificationReadParamsSchema = z.object({
  notificationId: z.string().min(1),
});

export type MarkNotificationReadParams = z.infer<typeof markNotificationReadParamsSchema>;

/** WebSocket payload for new notifications. */
export const wsNotificationPayloadSchema = z.object({
  notification: notificationApiDtoSchema,
});

export type WsNotificationPayload = z.infer<typeof wsNotificationPayloadSchema>;

