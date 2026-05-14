import { z } from 'zod';

/**
 * Nested SDP request fields used for REST + webhook mapping (unknown keys preserved until parse).
 * HD API often returns `null` for absent scalar fields.
 */
export const sdpRequesterSchema = z
  .object({
    email_id: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
  })
  .passthrough();

export const sdpTechnicianSchema = z
  .object({
    name: z.string().nullable().optional(),
    email_id: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
  })
  .passthrough();

export const sdpNamedRefSchema = z
  .object({
    name: z.string().nullable().optional(),
  })
  .passthrough();

/**
 * Minimal ServiceDesk Plus / SDP On-Demand "request" record for ingestion.
 */
export const sdpRequestSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    subject: z.string().nullable().optional(),
    description: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
    status: sdpNamedRefSchema.nullable().optional(),
    priority: sdpNamedRefSchema.nullable().optional(),
    technician: sdpTechnicianSchema.nullable().optional(),
    requester: sdpRequesterSchema.nullable().optional(),
  })
  .passthrough();

export type SdpRequest = z.infer<typeof sdpRequestSchema>;

/**
 * Webhook POST body: primary shape `{ request: { ... } }`.
 */
export const helpdeskWebhookBodySchema = z
  .object({
    request: sdpRequestSchema.optional(),
  })
  .passthrough();

export type HelpdeskWebhookBody = z.infer<typeof helpdeskWebhookBodySchema>;

/**
 * Zoho OAuth token JSON (subset used by the API client).
 */
export const zohoTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.coerce.number().int().positive().optional(),
  token_type: z.string().optional(),
});

export type ZohoTokenResponse = z.infer<typeof zohoTokenResponseSchema>;
