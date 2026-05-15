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
 * SDP display id: APIs may return `{ value, display_value }` or a plain string/number.
 */
/**
 * Coerces SDP `display_id` fragments that are plain scalars to string.
 * Objects and arrays are rejected so we never stringify arbitrary JSON.
 */
function sdpDisplayIdPart(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  return undefined;
}

export const sdpDisplayIdSchema = z.preprocess((raw: unknown) => {
  if (typeof raw === 'string' || typeof raw === 'number') {
    const v = sdpDisplayIdPart(raw);
    if (v !== undefined) {
      return { value: v, display_value: v };
    }
    return raw;
  }
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const valueRaw = o.value;
    const displayRaw = o.display_value;
    const valueStr = sdpDisplayIdPart(valueRaw);
    if (valueStr !== undefined) {
      const displayStr = sdpDisplayIdPart(displayRaw) ?? valueStr;
      return { value: valueStr, display_value: displayStr };
    }
    const onlyDisplay = sdpDisplayIdPart(displayRaw);
    if (onlyDisplay !== undefined) {
      return { value: onlyDisplay, display_value: onlyDisplay };
    }
  }
  return raw;
}, z.object({
  value: z.union([z.string(), z.number()]).transform((v) => String(v)),
  display_value: z.union([z.string(), z.number()]).transform((v) => String(v)),
}));

export const sdpRequestSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    display_id: sdpDisplayIdSchema,
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
