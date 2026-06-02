/** Single-tenant default when `VITE_DEFAULT_ORG_ID` is unset. */
const FALLBACK_ORG_ID = 'ti';

/**
 * Resolves org id for auth flows from `VITE_DEFAULT_ORG_ID`, falling back to `ti`.
 */
export function resolveDefaultOrgId(): string {
  const raw = import.meta.env.VITE_DEFAULT_ORG_ID;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return FALLBACK_ORG_ID;
}
