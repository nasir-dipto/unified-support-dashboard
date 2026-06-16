# UnifyDesk Security Review

**Date:** 2026-06-09  
**Scope:** Read-only review of `apps/api`, `apps/web`, `packages/shared-types`, `packages/ui`, integration services, and dependency audit.  
**Context:** Pre-production SaaS handling Jira + ManageEngine tickets, customer PII, Bedrock AI, and regulated-client readiness.

---

## Executive summary

UnifyDesk has a solid baseline: RS256 JWTs with refresh rotation and server-side `jti` binding, Zod validation on most API inputs, parameterized PostgreSQL queries, HMAC-verified Jira webhooks, org-scoped DynamoDB reads, and React text rendering (no `dangerouslySetInnerHTML`) for ticket/comment bodies.

**Primary gaps for enterprise / PII workloads:**

1. **Technicians can read any org ticket and full comment threads via direct API** — write is restricted, read is not.
2. **WebSocket fan-out is org-wide** — technicians receive realtime events (including full ticket payloads) for tickets they are not assigned to.
3. **Customer email replies allow raw HTML passthrough** — HTML injection in outbound email to requesters.
4. **JWT passed in WebSocket query string** — token exposure via logs, proxies, and browser history.
5. **Production error handling can leak upstream integration responses and stack-derived messages** to API clients.
6. **Weak abuse controls** on auth, AI, and webhooks relative to cost and credential-guessing risk.

---

## Findings

### CRITICAL

#### C-1 — Global demo architecture exposes a full local API to the public internet

| | |
|---|---|
| **Location** | `scripts/demo-global.sh`, `docs/GLOBAL-DEMO-RUNBOOK.md`, Cloudflare quick tunnel + here.now publish flow |
| **Risk** | The documented demo pattern tunnels `localhost:3001` to a public `trycloudflare.com` URL while the host runs real Docker data (DynamoDB, Postgres, seeded `admin@usd.dev` / `Admin123!`). Anyone with the URL can attack a developer's laptop API, including auth, ticket data, and admin settings. This is incompatible with regulated data or production-like datasets. |
| **Recommendation** | Never use quick tunnels with real PII. For demos: dedicated ephemeral environment, separate credentials, VPN-only access, or AWS-hosted staging with WAF/ALB. Document as **dev-only** and block in corporate policy. |

#### C-2 — Vitest arbitrary file read (dev dependency)

| | |
|---|---|
| **Location** | `apps/api/package.json`, `apps/web/package.json` — `vitest@^3.0.5` (audit: patched in `>=3.2.6`, [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp)) |
| **Risk** | When Vitest UI server is listening, arbitrary files can be read/executed. Affects CI/dev machines if UI is bound beyond localhost. |
| **Recommendation** | Upgrade Vitest (and `@vitest/coverage-v8`) to `>=3.2.6` across workspaces. Ensure CI never runs `vitest --ui` on shared runners with sensitive files. |

---

### HIGH

#### H-1 — Technicians can read any ticket and comment thread in their org via API

| | |
|---|---|
| **Location** | `apps/api/src/utils/ticket-access.ts` (`canReadTicket()` always returns `true`); `apps/api/src/routes/tickets.handlers.ts` (`getTicket`, `getTicketComments` — `requireAuth` only, no read-scope check) |
| **Risk** | Any authenticated technician who knows or guesses a `ticketId` can `GET /api/tickets/:id` and `GET /api/tickets/:id/comments`, receiving `customerEmail`, descriptions, sentiment, `internalId`, and full conversation history. UI may default to "My tickets", but **API enforcement does not match least-privilege** for PII/regulated clients. |
| **Recommendation** | Enforce read scoping server-side: technicians → assigned tickets only (reuse `isTicketAssignedToUser` / `listAssignedTicketIds`); managers/super_admin → org-wide. Apply to detail, comments, KB search context, and linked-ticket fetches. Add integration tests proving cross-technician reads return 403. |

#### H-2 — WebSocket broadcasts org-wide ticket payloads without role scoping

| | |
|---|---|
| **Location** | `apps/api/src/services/websocket.service.ts` (`broadcastWsEnvelope` fans out to all sockets in `orgId`); `apps/api/src/routes/ticket-broadcast.ts`; `apps/web/src/hooks/useWebSocket.ts` |
| **Risk** | REST activity feed is scoped for technicians (`scopeActivityEventsForRole` in `activity.handlers.ts`), but **live WebSocket events are not**. Technicians receive `ticket_created` / `ticket_updated` / `comment_added` envelopes with full ticket snapshots (including `customerEmail`) for unassigned tickets. |
| **Recommendation** | Scope WS fan-out per connection: store `userId`/`roles` at upgrade time; filter envelopes before `client.send()`. Alternatively, send ticket IDs only and force clients to refetch with scoped REST. |

#### H-3 — Customer email reply allows unescaped HTML in outbound messages

| | |
|---|---|
| **Location** | `apps/api/src/services/helpdesk.service.ts` — `wrapEmailReplyDescription()` (lines ~581–589) |
| **Risk** | If reply body matches `/<[a-z][\s\S]*>/i`, it is sent **verbatim** to ManageEngine as HTML email. A compromised technician account (or malicious insider) can send phishing/HTML payloads to customers. Plain-text path escapes entities; HTML path does not sanitize. |
| **Recommendation** | Always escape/sanitize HTML (allowlist tags if rich text is required). Prefer plain-text-only for customer replies. Strip scripts, event handlers, and external resource loads. Add server-side validation on `postTicketCommentBodySchema` for `hd_email` replies. |

#### H-4 — Access JWT transmitted in WebSocket URL query parameter

| | |
|---|---|
| **Location** | `apps/web/src/hooks/useWebSocket.ts` (`/ws?token=...`); `apps/api/src/index.ts` (upgrade handler reads `url.searchParams.get('token')`) |
| **Risk** | Query-string tokens appear in access logs (reverse proxies, Cloudflare, ALB), browser history, and Referer headers. Token theft enables session hijacking until access JWT expiry (default 15 min). |
| **Recommendation** | Use `Sec-WebSocket-Protocol` or post-connect auth message over WSS. Never log query strings at proxies. Shorten access TTL further for WS if query auth is retained temporarily. |

#### H-5 — Internal server errors expose raw `Error.message` to clients

| | |
|---|---|
| **Location** | `apps/api/src/utils/errors.ts` — `toApiErrorBody()` |
| **Risk** | Non-`AppError` exceptions return `error: err.message` with HTTP 500. DynamoDB, Postgres, or unexpected library errors may leak table names, connection strings fragments, or stack-context paths to any API caller. |
| **Recommendation** | Return generic `"Internal server error"` for unknown errors in production; log full detail server-side only. Gate verbose messages behind `NODE_ENV === 'development'`. |

#### H-6 — Integration API errors forwarded to clients (Jira / Helpdesk / Zoho)

| | |
|---|---|
| **Location** | `apps/api/src/services/jira.service.ts` (`jiraFetch` — up to 500 chars of response body); `apps/api/src/services/helpdesk.service.ts` (`helpdeskFetchWithBackoff`); `apps/api/src/services/zohoAuth.service.ts`; `apps/api/src/services/email.service.ts` (`SMTP_ERROR` with nodemailer message) |
| **Risk** | When comment sync or email reply fails, upstream response bodies (may include account hints, OAuth errors, internal SDP messages) can propagate through the global error handler to the browser. |
| **Recommendation** | Map integration failures to stable, client-safe codes (`JIRA_API`, `HELPDESK_API`) with generic messages. Log upstream bodies at `warn`/`error` server-side only. |

#### H-7 — CORS reflects any origin with credentials enabled

| | |
|---|---|
| **Location** | `apps/api/src/app.ts` — `cors({ origin: true, credentials: true })` |
| **Risk** | Any website can make credentialed cross-origin requests **if** it possesses the bearer token (e.g., via XSS). Combined with in-memory tokens (not HttpOnly cookies), this increases blast radius of any future XSS. For browser clients on known domains, reflected origins are unnecessarily permissive. |
| **Recommendation** | Restrict `origin` to `WEB_APP_URL` (+ explicit staging URLs). Disable `credentials` if only `Authorization` header is used (no cookies). |

---

### MEDIUM

#### M-1 — No dedicated rate limits on auth, password reset, or AI endpoints

| | |
|---|---|
| **Location** | `apps/api/src/middleware/rate-limit.middleware.ts` — single limiter: 100 req/min/IP on `/api`; auth routes share it; webhooks **excluded** |
| **Risk** | Login/forgot-password/refresh/AI invoke share one bucket. 100/min allows credential stuffing and refresh-token grinding. AI endpoints can incur Bedrock cost. Webhooks have no rate limit → DoS via forged traffic (still need secrets for processing, but CPU/json parsing cost remains). |
| **Recommendation** | Add stricter per-route limiters: login 5–10/min/IP, forgot-password 3/hour/email, AI 10–20/min/user, webhooks 60/min/IP. Use Redis store behind ALB for distributed limits. |

#### M-2 — Bcrypt cost factor 8

| | |
|---|---|
| **Location** | `apps/api/src/services/auth.service.ts`, `apps/api/src/services/password-reset.service.ts`, `apps/api/src/scripts/seed-admin.ts` — `BCRYPT_ROUNDS = 8` |
| **Risk** | Below OWASP recommendation (10–12+) for password storage. Weaker offline cracking resistance if `support_users` is exfiltrated. |
| **Recommendation** | Increase to 12+ for new hashes; rehash on successful login (upgrade path). |

#### M-3 — Forgot-password reveals SMTP configuration state

| | |
|---|---|
| **Location** | `apps/api/src/services/password-reset.service.ts` — `requestPasswordReset()` throws `SMTP_NOT_CONFIGURED` 503 when user exists but SMTP unset |
| **Risk** | Differs from silent success when user does not exist → **account enumeration** + infra fingerprinting. |
| **Recommendation** | Always return `{ status: 'ok' }` from forgot-password; log/email failures internally. |

#### M-4 — Unauthenticated detailed health endpoint

| | |
|---|---|
| **Location** | `apps/api/src/routes/health.handlers.ts` — `GET /api/health/detail` (no auth; excluded from rate limit) |
| **Risk** | Exposes dependency topology (`dynamodb`, `redis`, `postgres`, `websocket.connections`, `uptime`, `version`). Useful for attackers mapping stack and detecting degraded state. |
| **Recommendation** | Require admin auth or network-level restriction (security group / internal ALB only). Public LB should expose minimal `/health` only. |

#### M-5 — `internalId` (ManageEngine SDP id) exposed in ticket API DTO

| | |
|---|---|
| **Location** | `packages/shared-types/src/tickets/schemas.ts` — `ticketApiDtoSchema` includes `internalId` |
| **Risk** | Internal integration identifiers aid reconnaissance for direct SDP API attacks if other credentials leak. Not needed for most UI roles. |
| **Recommendation** | Omit `internalId` from public DTO; resolve server-side only in comment/email handlers. |

#### M-6 — KB semantic search allowed for any authenticated role without ticket read check

| | |
|---|---|
| **Location** | `apps/api/src/routes/kb.handlers.ts` — `POST /api/kb/search` (`requireAuth` only); builds full AI context via `buildKbContext` |
| **Risk** | Technicians can run semantic search (Bedrock embedding + DB query) against tickets they should not access, pulling KB matches derived from full thread context. |
| **Recommendation** | Apply same read-scope rules as ticket detail before `buildKbContext`. |

#### M-7 — Assignee matching heuristics may grant write access incorrectly

| | |
|---|---|
| **Location** | `apps/api/src/utils/ticket-access.ts` — `isTicketAssignedToUser()` (substring/`includes` matching on email local-part and display name) |
| **Risk** | Colliding assignee display names or partial email matches could grant **write** access to wrong tickets (e.g., assignee `"Nasir"` matches multiple users). |
| **Recommendation** | Match on stable identifiers (`userId` stored on ticket at sync, or exact email). Deprecate fuzzy `includes` matching. |

#### M-8 — Helpdesk webhook secret compared with non-constant-time equality

| | |
|---|---|
| **Location** | `apps/api/src/routes/webhooks.handlers.ts` — `hdrVal !== secret` (contrast: Jira uses `timingSafeEqual` in `jiraWebhookSignature.ts`) |
| **Risk** | Theoretical timing side-channel on webhook secret (low practical risk over network). |
| **Recommendation** | Use `crypto.timingSafeEqual` on normalized buffers, same as Jira path. |

#### M-9 — AI prompt injection via ticket/comment content

| | |
|---|---|
| **Location** | `apps/api/src/ai/buildTicketContext.ts`, `apps/api/src/services/bedrock.service.ts`, handlers in `apps/api/src/routes/ai.handlers.ts` |
| **Risk** | Untrusted Jira/HD text is embedded in Bedrock prompts (triage, comment draft, KB draft, sentiment). Attackers can craft ticket text to manipulate model output ("ignore previous instructions"). |
| **Recommendation** | Delimiter framing, output schema validation (already partial), human-in-the-loop for published content, monitor for anomalous outputs. Consider Bedrock Guardrails. |

#### M-10 — Dependency vulnerabilities (moderate, mostly dev/transitive)

| | |
|---|---|
| **Location** | `pnpm audit` (2026-06-09) |
| **Risk** | Notable paths: `esbuild` via Vite (dev server request leak), `vite` path traversal in `.map` handling, `react-router` open redirect (`>=6.30.4` fix), `turbo` CSRF (`>=2.9.14`), `qs` DoS via supertest chain. Production runtime impact is lower for dev-only packages but CI and preview deploys matter. |
| **Recommendation** | Upgrade Vite to `>=6.4.2` (or patched 5.x), React Router `>=6.30.4`, Turbo `>=2.9.14`, Vitest `>=3.2.6`. Run `pnpm audit` in CI and fail on high/critical production deps. |

#### M-11 — Ephemeral JWT keys in development

| | |
|---|---|
| **Location** | `apps/api/src/config/ensureDevJwtKeys.ts` |
| **Risk** | If `NODE_ENV=development` in a publicly reachable deploy without `JWT_*` set, ephemeral RSA keys are generated per process — sessions invalid on restart, but **anyone who captured tokens during that window** could use them. Mis-set `NODE_ENV` is a common deployment footgun. |
| **Recommendation** | Fail startup in any non-localhost bind if inline/ARN keys missing. Remove ephemeral key generation for shared/staging hosts. |

#### M-12 — SMTP credentials returned to super_admin via GET

| | |
|---|---|
| **Location** | `apps/api/src/routes/settings.handlers.ts` — `GET /api/settings/smtp`; `packages/shared-types/src/settings/schemas.ts` includes `password` |
| **Risk** | Expected for admin UI, but SMTP password in API responses increases XSS/audit exposure. |
| **Recommendation** | Return `password: undefined` or `hasPassword: true` on GET; accept password only on PUT. Encrypt at rest in DynamoDB (KMS). |

---

### LOW

#### L-1 — Session tokens held only in Zustand memory (no HttpOnly cookie)

| | |
|---|---|
| **Location** | `apps/web/src/store/auth.store.ts`, `apps/web/src/api/client.ts` |
| **Risk** | **Positive:** tokens not in `localStorage` reduces persistent XSS theft. **Negative:** full page reload clears session; refresh token not persisted — users re-login often. XSS can still read memory during session. |
| **Recommendation** | For enterprise: HttpOnly `Secure` `SameSite=Strict` refresh cookie + short-lived access token in memory; or BFF pattern. |

#### L-2 — Demo / seed credentials documented in repo

| | |
|---|---|
| **Location** | `apps/api/src/scripts/seed-admin.ts`, `CLAUDE.md`, `docs/GLOBAL-DEMO-RUNBOOK.md`, `apps/web/src/views/LoginView.tsx` (`VITE_SHOW_DEMO_HINTS`), `apps/e2e/src/constants/credentials.ts` |
| **Risk** | Predictable credentials if seed script runs in shared/staging without rotation. |
| **Recommendation** | Force password change on first login in non-dev envs. Never seed `Admin123!` in staging/prod. Disable demo hints in production builds. |

#### L-3 — Login `orgId` supplied by client

| | |
|---|---|
| **Location** | `packages/shared-types/src/auth/schemas.ts` — `loginRequestSchema.orgId`; `apps/web/src/utils/default-org.ts` |
| **Risk** | Multi-tenant brute-force can iterate org IDs. Low if org IDs are unguessable ULIDs. |
| **Recommendation** | Derive org from subdomain/email domain in production SaaS; rate-limit per org+email. |

#### L-4 — XSS surface in React rendering (currently mitigated)

| | |
|---|---|
| **Location** | `apps/web/src/components/tickets/TicketDetailContent.tsx` — `{body}` in text nodes with `whitespace-pre-wrap`; `apps/api/src/utils/htmlText.ts` strips/decodes HTML at ingest |
| **Risk** | No `dangerouslySetInnerHTML` found. HTML from ManageEngine is converted to plain text server-side. **Residual risk:** if ingest sanitization is bypassed or a future UI renders HTML, stored XSS is possible. |
| **Recommendation** | Add CSP headers on web static hosting. Keep HTML-to-text at ingest; add RTL tests asserting script tags render as literal text. |

#### L-5 — No security headers (Helmet / CSP) on API or web

| | |
|---|---|
| **Location** | `apps/api/src/app.ts`; Vite static hosting |
| **Risk** | Missing `X-Content-Type-Options`, `CSP`, `HSTS`, `Referrer-Policy` increases impact of any future XSS or MIME confusion. |
| **Recommendation** | Add Helmet (or CDN headers). Set `Referrer-Policy: no-referrer` especially while WS uses query tokens. |

#### L-6 — Zoho access token cached in process memory

| | |
|---|---|
| **Location** | `apps/api/src/services/zohoAuth.service.ts` |
| **Risk** | Standard pattern; token readable in process memory / heap dumps. |
| **Recommendation** | Acceptable with locked-down ECS tasks; use short-lived tokens and secrets from Secrets Manager (already planned in `DEPLOYMENT.md`). |

#### L-7 — Git hygiene for local secrets

| | |
|---|---|
| **Location** | `.gitignore` covers `.env.local`; untracked `.cursor/mcp.json`, `.cursor/jira-*.env.example` in repo status |
| **Risk** | Jira MCP tokens in `.cursor/mcp.json` could be committed accidentally. `.env.local.personal.backup` is gitignored but exists on disk. |
| **Recommendation** | Add `.cursor/mcp.json` to `.gitignore`. Use `git-secrets` or pre-commit hook scanning for API tokens. |

---

## Area-by-area notes

### 1. Auth / JWT

| Topic | Assessment |
|-------|------------|
| Algorithm | RS256 via `jose`; access/refresh type separation (`typ` claim) |
| Expiry | Access default 900s; refresh 14d — reasonable |
| Refresh rotation | New `jti` persisted; old refresh invalidated on mismatch |
| Validation | `verifyAccessToken` checks claims and role schema |
| Storage | In-memory Zustand (no localStorage) |
| Dev fallback | Ephemeral keys in development only — see M-11 |
| Gaps | No MFA, no account lockout, no device binding, query-string WS token (H-4) |

### 2. Secrets / env

| Topic | Assessment |
|-------|------------|
| `.env.local` | Gitignored; `.env.example` has placeholders only |
| Production path | `JWT_KEY_SECRET_ARN` + Secrets Manager documented in `DEPLOYMENT.md` |
| Integration secrets | `JIRA_API_TOKEN`, `HD_CLIENT_SECRET`, `HD_REFRESH_TOKEN` from env — not logged in services reviewed |
| Risk | Demo tunnel (C-1); committed demo passwords in docs (L-2) |

### 3. Input validation

| Topic | Assessment |
|-------|------------|
| API routes | Handlers consistently use `safeParse` + `AppError` 400 |
| Comments | `body` min 1 / max 16000 chars |
| DynamoDB | Parameterized expressions; orgId in key conditions |
| PostgreSQL | Parameterized `$1..$n`; ILIKE uses bound pattern |
| pgvector | `formatVectorLiteral` from model output, not user input |
| Gaps | HTML email passthrough (H-3); no HTML allowlist at ingest |

### 4. Integration credentials

| Topic | Assessment |
|-------|------------|
| Jira | Basic auth from env; webhook HMAC with timing-safe compare |
| Helpdesk | Zoho OAuth refresh; token in `Authorization` header only |
| Error leakage | Upstream bodies in AppError messages (H-6) |
| Logging | No evidence of token logging; Zoho errors include response snippet |

### 5. Customer email reply

| Topic | Assessment |
|-------|------------|
| Gating | `HELPDESK_EMAIL_REPLY_ENABLED` env flag + UI disable |
| Threading | `in_reply_to: { id: internalId }` — correct SDP pattern |
| Authorization | `requireTicketWriteAccess` on POST comment |
| Content | Plain text escaped; **HTML passthrough if body looks like HTML** (H-3) |
| Recipient | SDP addresses requester via `in_reply_to` — no client-controlled `to` |

### 6. Authorization / scoping

| Role | Tickets read | Tickets write | Activity REST | Activity WS |
|------|-------------|---------------|---------------|-------------|
| technician | **All org tickets (API)** | Assigned only | Scoped | **Not scoped** |
| manager | All | All | All | All |
| super_admin | All | All | All | All |

KB mutations: manager/super_admin. Reports/sentiment: manager+. Settings/SMTP: super_admin.

### 7. Rate limiting & abuse

- Global 100/min/IP; health + webhooks exempt
- No login-specific or AI-specific limits (M-1)
- `E2E_DISABLE_RATE_LIMIT` and dev loopback bypass documented in middleware

### 8. Data exposure

- Ticket DTO includes PII (`customerEmail`, `sentiment`, `internalId`)
- User list excludes password hashes (good)
- Notifications org-scoped but not user-scoped

### 9. XSS

- React escapes text content; HD HTML stripped server-side
- Email HTML injection is outbound vector (H-3), not stored XSS in app UI

### 10. Dependencies

See M-10 and C-2. Production runtime deps (Express 5, jose, bcryptjs, pg) had no critical audit hits; main issues are dev tooling and transitive test deps.

---

## Recommended remediation priority

1. **Before regulated pilot:** H-1, H-2, H-3, H-4, H-5, H-6, M-1, M-4  
2. **Before production GA:** H-7, M-2, M-3, M-5, M-6, M-7, M-9, M-10, L-5  
3. **Operational:** C-1 (eliminate public tunnel demos with real data), C-2 (Vitest upgrade)

---

## Positive controls observed

- Refresh token rotation with server-side `jti` revocation  
- Org isolation on DynamoDB `getTicketById` (`orgId` mismatch → 404)  
- Jira webhook raw-body HMAC verification  
- Zod schemas shared between frontend and API (`@usd/shared-types`)  
- AI invocation builds context server-side (client cannot inject arbitrary prompt context)  
- `postTicketComment` rolls back local comment if external post fails  
- Password reset tokens are one-time with expiry (`auth-tokens` table)  
- Forgot-password does not reveal user existence when SMTP is configured  

---

*This review did not include penetration testing, infrastructure (CDK/WAF) validation, or AWS IAM boundary analysis. Re-review after authorization scoping and WS changes are implemented.*
