# UnifyDesk Architecture & Feature Completeness Review

**Date:** 2026-05-21  
**Scope:** Read-only review of `apps/api`, `apps/web`, `packages/*`, `infra/`, sync scripts, and test suite.  
**Context:** Pre-production SaaS — Jira + ManageEngine aggregation, AI triage, sentiment, KB, reports. Phases 0–7 complete; Phase 8 (reports/notifications) partially landed; Phase 9 (admin hardening) not started.  
**Companion:** See `docs/reviews/SECURITY_REVIEW.md` and `docs/reviews/UIUX_REVIEW.md` for security and frontend UX findings.

---

## Executive summary

The monorepo is well-structured for a mid-stage product: clear separation of `apps/api` (Express + DynamoDB + Postgres/pgvector), `apps/web` (React), and `packages/shared-types` (Zod contracts). Route/handler split, org-scoped DynamoDB reads, JWT auth with refresh rotation, and CI integration tests against DynamoDB Local + Postgres are solid foundations.

**Primary blockers for enterprise production at scale:**

1. **Ticket list and reports load the entire org into memory** — `listAllTicketsForOrg()` is the hot path for queue, facets, reports, SLA scans, and technician activity scoping.
2. **No structured observability** — console-only logging; no request IDs, metrics, or distributed tracing.
3. **Async messaging is stubbed** — SQS enqueue logs only; webhooks process synchronously on the HTTP thread.
4. **WebSocket fan-out is in-process and org-wide** — `WS_MODE=gateway` is a no-op; multi-instance ECS cannot share connections.
5. **Critical HTTP path untested** — `POST /api/tickets/:id/comments` (local persist + Jira/HD mirror + rollback) has no integration test.
6. **No audit trail** — user actions (login, comment post, settings change, KB publish) are not persisted for compliance.
7. **Permission logic duplicated** — API `ticket-access.ts` and web `permissions.ts` must stay in sync manually.

---

## Findings by priority

### HIGH

#### H-1 — Full-org ticket load for list, facets, reports, and activity

| | |
|---|---|
| **Location** | `apps/api/src/db/tables/tickets.ts` — `listAllTicketsForOrg()` (lines 238–262), called by `listTickets()` (283), `listAssignedTicketIds()` (272); `apps/api/src/services/reports.service.ts` — `loadTicketsCached()` (20–28); `apps/api/src/services/notifications.service.ts` — `scanSlaBreachesForOrg()` (171–185); `apps/api/src/routes/activity.handlers.ts` (technician scoping via `listAssignedTicketIds`) |
| **Issue** | Every `GET /api/tickets` request queries all tickets for the org via GSI `orgId-createdAt`, materializes full records in memory, then filters, sorts, computes facets, and slices one page. Reports repeat the same load (Redis cache stores aggregation results but **still reloads all tickets** on cache hit — see `loadTicketsCached` lines 22–24). |
| **At 10× volume** | ~10× memory per request, ~10× DynamoDB read units per list/report, P99 latency grows linearly; risk of OOM on ECS tasks under concurrent manager + technician traffic. Facet computation becomes prohibitively expensive. |
| **Recommendation** | Introduce server-side filtering on GSIs (`orgId-status`, `orgId-createdAt` with sort keys, `assigneeId-status` for “mine”). Precompute facet counters in a materialized item or ElastiCache. For reports, use DynamoDB streams → aggregation table or warehouse export. Expose **cursor-based** pagination for large lists per project conventions. |

#### H-2 — No production-grade observability

| | |
|---|---|
| **Location** | Entire `apps/api` — no pino/winston/morgan; `apps/api/src/index.ts` (startup `console.log` only); `apps/api/src/services/bedrock.service.ts` (errors bubble without metric); `apps/api/src/sentiment/batchProcessor.ts` (errors swallowed, `errors++` only) |
| **Issue** | No HTTP access logs (method, path, status, latency), no correlation/request ID, no structured JSON logs, no integration with CloudWatch/X-Ray/Datadog. Sync scripts log to stdout only. WS activity persistence failures are silently ignored (`websocket.service.ts` lines 74–75). |
| **Impact** | Production incidents (sync stall, Bedrock timeout spike, comment mirror failure) cannot be triaged from logs alone. |
| **Recommendation** | Add request-logging middleware with `x-request-id`; structured logger (pino) with `orgId`, `userId`, `ticketId` on business events; CloudWatch metrics for sync duration, Bedrock latency/errors, DynamoDB throttling; alert on sentiment batch `errors > 0`. |

#### H-3 — SQS / async webhook pipeline not wired

| | |
|---|---|
| **Location** | `apps/api/src/messaging/enqueueSqsEvent.ts` (stub — logs only); `apps/api/src/routes/webhooks.handlers.ts` (lines 73–81, 114–122 — SQS only in local dev); `apps/api/src/lambdas/sqsLambda.handler.ts` (exists but HTTP path does not enqueue in production) |
| **Issue** | Webhooks **synchronously** upsert tickets, broadcast WS, and run notification side effects on the HTTP request thread. `enqueueSqsEvent` is explicitly “Phase 2 stub.” CDK `usd-messaging-stack` defines queues but ECS handler does not publish. |
| **Impact** | Webhook timeouts under load; Jira/HD retries duplicate work; no backpressure; ECS task CPU tied to webhook burst. |
| **Recommendation** | Production path: HTTP 202 after signature verify → SQS → Lambda/consumer (`sqsLambda.handler.ts`). Idempotency key on `ticketId` + `updatedAt`. DLQ alarms (partially defined in CDK per CLAUDE.md). |

#### H-4 — WebSocket architecture does not scale horizontally

| | |
|---|---|
| **Location** | `apps/api/src/services/websocket.service.ts` — in-memory `orgClients` Map; `apps/api/src/index.ts` — local `/ws` upgrade; `WS_MODE=gateway` logs and returns without fan-out (lines 70–72) |
| **Issue** | Local mode: all connections on one Node process. Gateway mode: **no delivery**. Multi-task ECS: clients on task A miss broadcasts from task B. Fan-out is org-wide (no role/assignee filter). |
| **Recommendation** | API Gateway WebSocket + DynamoDB connection table, or Redis pub/sub between ECS tasks. Scope events by role or ticket assignment for technicians. |

#### H-5 — `POST /api/tickets/:ticketId/comments` untested at HTTP layer

| | |
|---|---|
| **Location** | `apps/api/src/routes/tickets.handlers.ts` — `postTicketComment` (lines 150–217); tests: `tickets.integration.test.ts` covers GET comments only; service tests in `jira.service.test.ts`, `helpdesk.service.test.ts` |
| **Issue** | Handler: create local comment → mirror to Jira/HD → **rollback** local comment on mirror failure (`deleteTicketComment`) → mark sentiment stale → WS broadcast. No supertest integration test for success, rollback, write-access denial, or `hd_email` disabled. |
| **Impact** | Highest-risk customer-facing mutation path; regression risk on every Jira/HD API change. |
| **Recommendation** | Add `tickets.integration.test.ts` cases: post jira_comment, hd_note; simulate Jira 500 → assert comment deleted; technician forbidden on unassigned ticket. |

#### H-6 — No audit logging for enterprise compliance

| | |
|---|---|
| **Location** | Codebase-wide — no `audit` table, middleware, or event stream |
| **Issue** | Actions not recorded: login/logout, failed auth, ticket comment post, cross-link, KB publish, user invite, SMTP/settings change, AI invoke (feature + ticketId). |
| **Recommendation** | Append-only `support_audit_log` (orgId + timestamp ULID) or CloudTrail-style export to S3/OpenSearch. Log actor, action, resource, IP, outcome. Retention policy per tenant. |

#### H-7 — Duplicated permission / assignee logic (API ↔ web)

| | |
|---|---|
| **Location** | `apps/api/src/utils/ticket-access.ts` + `role-helpers.ts`; `apps/web/src/utils/permissions.ts` + `roles.ts` |
| **Issue** | `isTicketAssignedToUser`, `canWriteTicket`, manager/admin gates implemented twice with separate test files. Drift already possible (fuzzy email/displayName matching is subtle). |
| **Recommendation** | Extract to `packages/shared-permissions` or export pure functions from `@usd/shared-types` (no Node deps). Single test suite; web and API import same module. |

#### H-8 — Technician read-all tickets (API contract)

| | |
|---|---|
| **Location** | `apps/api/src/utils/ticket-access.ts` — `canReadTicket()` always `true` (line 48); `GET /api/tickets` returns all org tickets regardless of role |
| **Issue** | Enterprise support tools typically scope technician **read** to assigned/team queue. Current model: write restricted, read org-wide (also WS — see security review). |
| **Recommendation** | Product decision: if enterprise requires read scoping, add `mine` default for technicians server-side and enforce on `GET /api/tickets/:id` + comments. Document breaking change. |

---

### MEDIUM

#### M-1 — API response shape inconsistency

| | |
|---|---|
| **Location** | `.cursorrules` specifies list `{ data, cursor?, total }`; actual: `ticketsListResponseSchema` uses **page/limit/totalPages** (`packages/shared-types/src/tickets/schemas.ts` lines 94–101); webhooks return `{ accepted: true }`; auth returns token object directly; health 503 returns health schema not error envelope |
| **Issue** | No cursor pagination anywhere. Success shapes vary by domain. Clients cannot adopt uniform list helper. |
| **Recommendation** | Document current contract in OpenAPI. For v2: unify list envelope + cursor on tickets/notifications/KB manager list. Keep page-based as deprecated alias during migration. |

#### M-2 — No API versioning

| | |
|---|---|
| **Location** | `apps/api/src/app.ts` — all routes under `/api/*`; `services/health.service.ts` — `API_VERSION = '1.0.0'` metadata only |
| **Issue** | Breaking schema changes require coordinated deploy of API + web. No `Accept-Version` or `/api/v1` prefix. |
| **Recommendation** | Add `/api/v1` mount before public beta; health detail already exposes version string for clients to check. |

#### M-3 — DynamoDB `support_kb` table unused; KB split-brain risk

| | |
|---|---|
| **Location** | `apps/api/src/db/ensureUsdLocalDynamoTables.ts` — `support_kb` table defined; runtime KB in **PostgreSQL** (`services/kb.service.ts`); Dynamo `support_kb` never read/written in app code |
| **Issue** | CDK/local Dynamo provisioning includes dead table. Operators may assume KB is in Dynamo. |
| **Recommendation** | Remove `support_kb` from CDK or document as deprecated; single source of truth in Postgres + pgvector. |

#### M-4 — Comment list capped at 50 with no pagination API

| | |
|---|---|
| **Location** | `apps/api/src/routes/tickets.handlers.ts` — `getTicketComments` uses limit 50; `db/tables/comments.ts` — `listTicketComments` supports `DEFAULT_PAGE = 200` but handler hardcodes 50 |
| **Issue** | Long Jira/HD threads truncate silently for AI context and UI. COUNT query + LIMIT adds latency on every detail load. |
| **Recommendation** | Paginate comments API (`cursor` on `ticketCommentKey`); lazy-load older thread in UI; pass full thread to AI via server-side fetch loop. |

#### M-5 — `upsertTicket` read-modify-write without conditional writes

| | |
|---|---|
| **Location** | `apps/api/src/db/tables/tickets.ts` — `upsertTicket()` (160–187); `isStaleTicketUpsert()` (50–57) |
| **Issue** | Stale guard is application-level only. Concurrent webhook + sync + user action can interleave GetItem/PutItem. HD reconcile runs **5 parallel** upserts (`hd-reconcile.ts` line 19). |
| **Recommendation** | DynamoDB `ConditionExpression` on `updatedAt` for core field updates; retry on `ConditionalCheckFailedException`. |

#### M-6 — Bedrock: timeout only, no retry; sentiment batch no degraded fallback

| | |
|---|---|
| **Location** | `apps/api/src/services/bedrock.service.ts` — 10s abort, single invoke; `ai/triage.ts`, `commentDraft.ts`, etc. — degraded HTTP 200 on failure; `services/sentiment.service.ts` — throws; `sentiment/batchProcessor.ts` — catch swallows (lines 56–57) |
| **Issue** | Interactive AI degrades gracefully; batch sentiment silently skips failures. No exponential backoff for transient Bedrock errors. |
| **Recommendation** | Retry 2× with jitter on 429/5xx; metric `bedrock.invocation.failed`. Sentiment batch: dead-letter queue for failed ticketIds; alert if `errors / examined > threshold`. |

#### M-7 — Reports cache does not reduce Dynamo load

| | |
|---|---|
| **Location** | `apps/api/src/services/reports.service.ts` — `loadTicketsCached()` |
| **Issue** | On cache hit for ticket load marker, still calls `listAllTicketsForOrg`. Only aggregated JSON (volume, SLA, etc.) is cached. |
| **Recommendation** | Cache ticket snapshot array with TTL, or push aggregation to scheduled job writing to `support_reports` table. |

#### M-8 — Notifications list loads entire partition

| | |
|---|---|
| **Location** | `apps/api/src/db/tables/notifications.ts` — `listNotifications()` (55–84) |
| **Issue** | All notification pages loaded into memory per `GET /api/notifications`. No pagination exposed. |
| **Recommendation** | Cursor pagination; archive read notifications to S3 after N days. |

#### M-9 — Rate limiting coarse for enterprise

| | |
|---|---|
| **Location** | `apps/api/src/middleware/rate-limit.middleware.ts` — 100 req/min/IP; webhooks exempt; auth/AI not separately limited |
| **Issue** | Shared limit for all `/api` routes; bypass in development loopback; no per-org or per-user limits. |
| **Recommendation** | Stricter limits on `/api/auth/login`, `/api/ai/invoke`; per-org quotas for Bedrock cost control. |

#### M-10 — Error messages may leak upstream integration text

| | |
|---|---|
| **Location** | `apps/api/src/services/jira.service.ts`, `helpdesk.service.ts` — `AppError` with response body snippets; `utils/errors.ts` — generic `Error.message` passed to client |
| **Recommendation** | Map integration failures to stable codes; log raw body server-side only (ties to H-2). |

#### M-11 — Infra: ECS defined but webhook/async path incomplete

| | |
|---|---|
| **Location** | `infra/lib/usd-compute-stack.ts`, `usd-messaging-stack.ts`, `usd-database-stack.ts` |
| **Issue** | CDK provisions VPC, ECS, SQS, Dynamo, RDS — but app runtime still behaves like monolithic Node (sync webhooks, local WS). |
| **Recommendation** | Deployment runbook: wire SQS publisher, API Gateway WS, EventBridge cron for `sentiment-batch` / reconcile Lambdas. |

#### M-12 — `packages/ui` Toggle unused; handler tests thin

| | |
|---|---|
| **Location** | `packages/ui/src/Toggle.tsx` — zero app imports; several `*.handlers.ts` lack dedicated tests (covered only via integration) |
| **Recommendation** | Remove or use `Toggle`; add handler unit tests for validation branches or rely on OpenAPI contract tests. |

---

### LOW

#### L-1 — Monorepo layout is sound; minor coupling notes

| | |
|---|---|
| **Location** | `pnpm-workspace.yaml` — `apps/*`, `packages/*`, `infra`; Vitest aliases to `packages/*/dist` |
| **Issue** | Web tests require pre-build of packages in CI (correct). `infra` test script is noop. `docs/design-reference.tsx` is orphan design artifact. |
| **Recommendation** | Keep shared-types as sole cross-app package; consider `@usd/permissions` extract (H-7). |

#### L-2 — SLA logic partially duplicated

| | |
|---|---|
| **Location** | `apps/api/src/utils/sla.ts`; `apps/web/src/utils/ticket-display.ts` — `estimateSlaPercentRemaining` different signatures |
| **Recommendation** | Share SLA math in shared-types if client triage ring must match server SLA reports exactly. |

#### L-3 — Jira reconcile `skipped` stat never incremented

| | |
|---|---|
| **Location** | `apps/api/src/scripts/jira-reconcile.ts` — `stats.skipped` (lines 48, 91) |
| **Issue** | Misleading ops logs; stale upserts not counted as skipped. |
| **Recommendation** | Increment when `isStaleTicketUpsert` prevents field overwrite. |

#### L-4 — Webhook path does not sync comments in real time

| | |
|---|---|
| **Location** | `webhooks.handlers.ts` — ticket upsert only; comment sync in reconcile scripts (`syncIssueComments`, `syncRequestConversations`) |
| **Issue** | Documented deferral to Phase 9. At 10× volume, 15-min incremental reconcile may leave thread stale. |
| **Recommendation** | Webhook comment events → queue → targeted comment sync handler. |

#### L-5 — Auth service unit coverage thin

| | |
|---|---|
| **Location** | `services/auth.service.test.ts` — 1 case; login/password hashing covered by `auth.integration.test.ts` only |
| **Recommendation** | Acceptable if integration stays comprehensive; add bcrypt edge cases if auth service grows. |

#### L-6 — Real Bedrock never exercised in CI

| | |
|---|---|
| **Location** | All AI tests use `USE_MOCK_AI=true` |
| **Recommendation** | Optional nightly smoke against Bedrock in staging; contract tests sufficient for CI. |

#### L-7 — `healthStatusSchema` dual definition

| | |
|---|---|
| **Location** | `packages/shared-types/src/index.ts` vs `health/schemas.ts` |
| **Recommendation** | Consolidate to single export. |

#### L-8 — CSV export exists server-side but weak UX

| | |
|---|---|
| **Location** | `apps/api/src/reports/toCsv.ts`, `reports.handlers.ts` — `?format=csv`; web `ManagerReportingTab.tsx` shows raw URL hint only |
| **Recommendation** | Download button; same auth as JSON report. |

---

## Category cross-reference

| Category | Key findings |
|----------|----------------|
| **1. Code organization** | H-7, M-3, M-12, L-1, L-2, L-7 |
| **2. API design** | H-1, M-1, M-2, M-4, M-9, M-10 |
| **3. Data model** | H-1, M-3, M-4, M-5, M-8, H-6 |
| **4. Test coverage** | H-5, M-12, L-5, L-6 |
| **5. Error handling & resilience** | M-5, M-6, M-10; HD backoff in `helpdesk.service.ts` (`HELPDESK_429_RETRY_DELAYS_MS`); comment rollback in `postTicketComment` |
| **6. Observability** | H-2 |
| **7. Enterprise feature gaps** | H-6, H-8, L-8; no bulk actions, no data export UI, no SSO/SAML, no tenant admin self-service for integrations |
| **8. Sync architecture** | H-3, M-5, L-3, L-4; see § Sync deep-dive below |

---

## Sync architecture deep-dive

### Current model

| Aspect | Jira | ManageEngine HD |
|--------|------|-----------------|
| **CLI** | `scripts/jira-reconcile.ts` | `scripts/hd-reconcile.ts` |
| **Default mode** | Full sync | Full sync |
| **Incremental** | `--incremental` → last 15 min (`syncCliArgs.ts`) | Same |
| **API filter** | JQL `updated > -Nm` | `last_updated_time` filter |
| **Pagination** | 25 issues/page, sequential projects | 25 rows/page |
| **Concurrency** | Sequential per issue | 5 parallel (`HD_RECONCILE_CONCURRENCY`) |
| **Per ticket** | `upsertTicket` → `syncIssueComments` | `upsertTicket` → `markSentimentStale` → `syncRequestConversations` |
| **Post-run** | — | `runIncrementalBatch()` (sentiment) + `scanSlaBreachesForOrg()` |
| **Webhooks** | Sync upsert on HTTP thread | Same |
| **Stale protection** | `isStaleTicketUpsert` on `updatedAt` | Same |

### Race conditions

1. **Webhook vs reconcile** — Both call `upsertTicket`; last writer wins on `updatedAt` comparison; no lock.
2. **HD parallel reconcile** — Five tickets upserted concurrently; same ticket unlikely twice per page but possible across pages.
3. **Comment sync** — Reconcile only; webhook comment events ignored → thread lag until next reconcile.
4. **Sentiment** — `sentimentStale` flag set on sync/webhook; batch runs sequentially; hourly re-analysis cap in `sentiment/eligibility.ts`.

### At 10× ticket volume

| Area | Expected behavior |
|------|-------------------|
| **Incremental sync (15 min)** | Likely still viable if update rate scales sublinearly. |
| **Full nightly sync** | Jira sequential projects × pages — wall-clock grows linearly; may exceed cron window. |
| **HD reconcile + sentiment** | `listHdTicketsForSentiment` loads all HD tickets; batch is O(n) Bedrock calls — **primary AI cost and duration bottleneck**. |
| **Ticket queue API** | **Degrades badly** (H-1) — dominant production risk. |
| **Webhooks** | Sync processing may timeout; Jira/HD retry storms without idempotency keys. |
| **DynamoDB** | GSI hot partitions on large `orgId`; on-demand may suffice; watch `orgId-createdAt` query RCUs. |

### Recommendations

1. Move reconcile + sentiment batch to **scheduled ECS task or Lambda** with lock (DynamoDB lease item).
2. **Shard sync** by project (Jira) or date range (HD).
3. **Webhook → SQS** (H-3) with dedupe on `(source, externalId, updatedAt)`.
4. **Streaming comment sync** on comment webhooks (L-4).
5. Metrics: `sync_duration_seconds`, `sync_tickets_upserted`, `sentiment_batch_errors`.

---

## Test coverage summary

| Package | Test files | Cases (approx.) | Notes |
|---------|------------|-----------------|-------|
| `apps/api` | 86 | **312** (310 pass in local run) | 6 integration files (~23 cases), DynamoDB-gated |
| `apps/web` | 67 | **158** | 100% unit/RTL; no live API |
| `packages/shared-types` | 9 | 27 | 4 schema modules untested (helpdesk, reports, settings, notifications) |
| `packages/ui` | 7 | 9 | |

### Critical path coverage matrix

| Path | Coverage | Gap |
|------|----------|-----|
| Login / refresh / logout | Strong integration | — |
| JWT middleware | Unit | — |
| GET /api/tickets (pagination, facets) | Integration | In-memory architecture not load-tested |
| POST comment + mirror + rollback | **None (HTTP)** | **H-5** |
| Jira/HD service postComment | Unit (nock) | — |
| Webhooks Jira/HD | Integration + unit | — |
| Sync mappers + CLI args | Unit | No E2E against real APIs (expected) |
| Technician write scoping | Unit + middleware | Read scoping untested (always allowed) |
| Bedrock / AI invoke | Mock integration | No real Bedrock |
| Sentiment batch script | Unit (1 case in batchProcessor) | No integration for full batch run |
| KB CRUD + search | Integration (Postgres) | — |
| Reports / notifications (Phase 8) | `phase8.integration.test.ts` | Partial |

---

## Enterprise feature gap checklist

| Capability | Status | Notes |
|------------|--------|-------|
| Audit log | **Missing** | H-6 |
| SSO / SAML / OIDC | **Missing** | Email/password only |
| Multi-org tenancy UI | **Partial** | `orgId` in JWT; single-org demo |
| Data export (tickets, comments) | **Missing** | Reports CSV API only |
| Bulk ticket actions | **Missing** | No assign/close/priority bulk |
| Integration self-service UI | **Stub** | `AdminIntegrationsTab` skeleton |
| Real-time comment sync | **Missing** | Reconcile only |
| Attachment proxy / inline images | **Deferred** | Phase 9 |
| SLA policy admin | **Partial** | Settings API exists; UI in admin |
| On-call / PagerDuty notifications | **Missing** | In-app + email only |
| Rate limits / AI quotas per org | **Weak** | M-9 |
| HA / multi-region | **Not designed** | Single-region CDK |
| Backup / restore runbook | **Not in repo** | Dynamo + RDS DR undocumented |

---

## Positive patterns to preserve

- **Zod-first contracts** in `@usd/shared-types` — handlers and web clients parse same schemas.
- **Route/handler split** with `asyncHandler` + global `toApiErrorBody` error envelope.
- **Org-scoped DynamoDB reads** with `orgId` in key conditions (reads); `getTicketById` org verification.
- **Comment post rollback** on external mirror failure (`tickets.handlers.ts` lines 186–196).
- **HD API resilience** — inter-request delay + 429 backoff (`helpdesk.service.ts`).
- **Stale ticket upsert guard** — reduces clobber from out-of-order events.
- **CI integration tests** with DynamoDB Local + Postgres + Redis.
- **Graceful shutdown** — `server/shutdown.ts` closes WS and HTTP.
- **Incremental sync CLI** — sensible 15-minute default for cron.

---

## Suggested remediation order

1. **H-1** — Server-side ticket filtering + cursor pagination (unblocks scale).  
2. **H-5** — Integration tests for comment POST.  
3. **H-2** — Structured logging + request IDs.  
4. **H-3** — Wire SQS for webhooks.  
5. **H-7** — Shared permissions package.  
6. **H-6** — Audit log MVP (comment, login, settings).  
7. **H-4** — WebSocket horizontal scaling design.  
8. **M-6** — Bedrock retry + sentiment batch alerting.

---

*Review performed without code changes. Re-run after Phase 8 completion (notifications) and Phase 9 (hardening), or after ticket-list scalability refactor.*
