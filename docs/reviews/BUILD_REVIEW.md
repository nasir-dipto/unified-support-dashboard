# UnifyDesk Build Health & Robustness Review

**Date:** 2026-05-21  
**Scope:** Read-only review of dependencies, TypeScript, CI, configuration, failure modes, Docker/local vs AWS, and performance.  
**Context:** Node 20 + pnpm 9 + Turborepo; pre-deployment per `DEPLOYMENT.md`.  
**Companion:** `docs/reviews/SECURITY_REVIEW.md`, `docs/reviews/ARCHITECTURE_REVIEW.md`, `docs/reviews/UIUX_REVIEW.md`.

---

## Executive summary

The build pipeline is **functional and strict**: ESLint `strictTypeChecked`, TypeScript `strict` + `noUncheckedIndexedAccess`, frozen lockfile CI, and integration tests against DynamoDB Local, Redis, and Postgres/pgvector. Local `docker compose` closely mirrors CI service topology.

**Primary build and robustness gaps:**

1. **CI runs 4 jobs, not a full production gate** — no E2E, no `pnpm audit`, no CDK synth, no bundle-size budget, coverage warnings are non-blocking.
2. **Known dependency advisories** — Vitest &lt;3.2.6 (critical, dev), Vite 5.4.x / esbuild (moderate, dev), react-router, turbo, qs (transitive).
3. **`loadEnv.ts` omits `SUPPORT_WS_ACTIVITY_TABLE`** — schema allows override but loader never passes it; custom table names in AWS won't apply.
4. **Ephemeral JWT keys in dev** — sessions invalidated on API restart unless `.env.local` keys are set.
5. **No API Dockerfile in repo** — `DEPLOYMENT.md` Step 2 references Docker build but no `Dockerfile` exists.
6. **Frontend bundle ~1.2 MB JS** (331 KB gzip) — single chunk, Vite warns &gt;500 KB; Recharts likely dominant.
7. **Ticket queue re-renders on every WebSocket event** — `TechnicianTicketsView` subscribes to full `events` array for urgent count only.

---

## CI pipeline map

GitHub Actions workflow: `.github/workflows/ci.yml` — **4 sequential jobs** (lint → typecheck → test → build), triggered on `feature/**`, `hotfix/**` PRs to `develop`/`main`.

| Job | What it runs | Services / env |
|-----|----------------|----------------|
| **Lint** | `pnpm lint` (Turbo → all packages with lint task) | Node 20, frozen lockfile |
| **Typecheck** | `pnpm typecheck` | Same |
| **Test** | shared-types + ui + infra tests; API + web `vitest run --coverage` | DynamoDB `:8000`, Redis `:6379`, Postgres pgvector `:5432`; `DYNAMODB_ENDPOINT`, `POSTGRES_URL`, `REDIS_URL`, webhook secrets, org IDs |
| **Build** | `pnpm build` (Turbo, depends on `^build`) | No services |

**Test job extras:** `kb:migrate` before tests; manual package build (`shared-types`, `ui`) because coverage bypasses Turbo `^build`; `scripts/check-coverage-baseline.mjs` — **warnings only, exit 0**; coverage artifacts uploaded.

### What CI does **not** cover (gaps)

| Missing check | Risk | Recommendation |
|---------------|------|----------------|
| **Playwright E2E** (`apps/e2e`, `pnpm e2e`) | Regressions in login, routing, role views | Add job: start API + web + services, run Playwright (or smoke subset) |
| **`pnpm audit`** | Known CVEs ship | Fail on high/critical production deps; warn on dev |
| **CDK synth** (`pnpm --filter @usd/infra synth`) | Infra TypeScript errors at deploy time | Add infra job after build |
| **Bundle size budget** | 1.2 MB JS grows unbounded | `vite build` + `size-limit` or compare to baseline in CI |
| **Blocking coverage thresholds** | Baseline 60/60/50% is advisory only | Gate on critical paths or raise floors over time |
| **Security scanning** (SAST, secret scan) | Leaked credentials in PRs | `gitleaks`, `trivy`, or GitHub Advanced Security |
| **API smoke against built `dist/`** | `tsc` emit vs `tsx` dev drift | `node dist/index.js` health check in CI |
| **Lint/typecheck of `apps/e2e`** | E2E package excluded from Turbo lint? | Verify e2e in lint filter |
| **Mailhog / SES** | Email flows untested in CI | Optional integration with mailhog service |
| **Production env validation** | `NODE_ENV=production` JWT ARN requirement untested in CI | Job with mock Secrets Manager or env fixture |

**Note:** User-facing “8 checks” may refer to GitHub’s combined status contexts; the workflow defines **4 named jobs**. Sub-steps (KB migrate, package build, coverage upload) are not separate required checks.

---

## Findings by priority

### HIGH

#### H-1 — Dependency advisories (Vitest critical, Vite/esbuild moderate)

| | |
|---|---|
| **Location** | `apps/api/package.json`, `apps/web/package.json` — `vitest@^3.0.5`; `apps/web` — `vite@^5.4.11`; root `turbo@^2.3.3`; lockfile resolves vitest 3.2.4, vite 5.4.21 |
| **Issue** | `pnpm audit` (2026-05-21): **critical** [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) Vitest &lt;3.2.6 (arbitrary file read when UI server enabled); **moderate** esbuild ≤0.24.2 via Vite (dev-server CORS); Vite 5.4.x advisory; react-router, turbo advisories. |
| **Impact** | Vitest: dev/CI only (not production bundle) but CI runs vitest. esbuild: dev server exposure if `vite` dev bound to network. |
| **Recommendation** | Bump `vitest` + `@vitest/coverage-v8` to `>=3.2.6`; upgrade Vite to `>=6.4.2` or patched 5.x; turbo `>=2.9.14`; add `pnpm audit --audit-level=high` to CI. |

#### H-2 — `loadEnv.ts` schema drift — `SUPPORT_WS_ACTIVITY_TABLE` not loaded

| | |
|---|---|
| **Location** | `packages/shared-types/src/env/server-env.ts` (line 75); `apps/api/src/config/loadEnv.ts` (lines 15–56) — field **absent** from `raw` object; `db/tables/ws-activity-events.ts` reads `env.SUPPORT_WS_ACTIVITY_TABLE` |
| **Issue** | Zod default `support_ws_activity_events` applies when key omitted, but **setting `SUPPORT_WS_ACTIVITY_TABLE` in ECS/Secrets has no effect** — value never copied from `process.env`. |
| **Recommendation** | Add all `serverEnvSchema` keys to `loadEnv` `raw` map (codegen or shared key list). Add test asserting every schema key is wired. |

#### H-3 — Ephemeral JWT keys invalidate sessions on dev restart

| | |
|---|---|
| **Location** | `apps/api/src/config/ensureDevJwtKeys.ts`; `apps/api/src/index.ts` (line 27); `DEPLOYMENT.md` (lines 70–71) |
| **Issue** | When `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` / `JWT_KEY_SECRET_ARN` unset and `NODE_ENV !== production`, API generates new RSA pair per process with `console.warn`. All refresh tokens signed with old keys become invalid. |
| **Impact** | Local/demo confusion; **production must use stable Secrets Manager keys** — documented but not enforced until `NODE_ENV=production` (then startup fails without ARN/keys). |
| **Recommendation** | Document in `.env.local.example`; fail fast in staging if ephemeral path would run; never use ephemeral keys on shared demos. |

#### H-4 — No E2E tests in CI

| | |
|---|---|
| **Location** | `apps/e2e/playwright.config.ts` — 6+ spec files (`auth`, `tickets`, `manager`, `admin`, `knowledge-base`, `technician`); root `package.json` `"e2e": "turbo e2e"`; **not in** `.github/workflows/ci.yml` |
| **Issue** | E2E requires live `localhost:5173` + API (`globalSetup: check-server.ts`). Full user journeys untested on every PR. |
| **Recommendation** | CI job: `docker compose up -d`, seed DB, `pnpm dev` or preview, Playwright with `CI=true`, upload traces on failure. |

#### H-5 — Frontend production bundle — single 1.2 MB chunk

| | |
|---|---|
| **Location** | `apps/web/vite.config.ts` — no `manualChunks` or `lazy()` routes; build output: `dist/assets/index-*.js` **1,216 KB** (331 KB gzip), Vite warning &gt;500 KB |
| **Issue** | Recharts, React Router, TanStack Query, and app code ship in one bundle. Slow first load on mobile/corporate networks. |
| **Recommendation** | Route-based `React.lazy` for Manager/Admin/KB views; `manualChunks` for `recharts`; analyze with `rollup-plugin-visualizer`. Enforce CI size budget. |

#### H-6 — Ticket queue re-renders on every WebSocket event

| | |
|---|---|
| **Location** | `apps/web/src/views/TechnicianTicketsView.tsx` (lines 47–48) — `useNotificationsStore((s) => s.events)`; `apps/web/src/store/notifications.store.ts` — `pushEvent` replaces array |
| **Issue** | Any WS message re-renders entire queue (filters, stats, all `TicketCard`s) even when only `urgentCount` derived from events changes. |
| **Recommendation** | Subscribe via selector: `useNotificationsStore((s) => countActionRequired(s.events))` with shallow compare, or `useSyncExternalStore`; memoize `TicketCard` with `React.memo`. |

#### H-7 — No Dockerfile / container build artifact

| | |
|---|---|
| **Location** | `DEPLOYMENT.md` Step 2 (“Build Docker image + push to ECR”); repo has **no** `Dockerfile` |
| **Issue** | ECS deployment path undefined in codebase; local `pnpm start` runs `node dist/index.js` without multi-stage image, non-root user, or healthcheck. |
| **Recommendation** | Add `apps/api/Dockerfile` (Node 20 alpine, `pnpm deploy` or copy dist + prod deps); align with CDK task definition. |

---

### MEDIUM

#### M-1 — Node 20 runtime vs `@types/node` 22

| | |
|---|---|
| **Location** | CI + stack standard: Node **20** (`.github/workflows/ci.yml`); `apps/api/package.json`, `apps/e2e`, `infra` — `@types/node@^22.10.5` |
| **Issue** | Type definitions target Node 22 APIs; no `engines` field in root `package.json` to pin runtime. AWS SDK v3 packages in lockfile declare `engines: { node: '>=20.0.0' }` — correct for Node 20, but types/runtime mismatch can hide incompatibilities. |
| **Recommendation** | Align `@types/node` to `^20.x`; add `"engines": { "node": ">=20 <21" }` at root; `.nvmrc` with `20`. |

#### M-2 — Split AWS SDK client versions

| | |
|---|---|
| **Location** | `apps/api/package.json` — `@aws-sdk/client-bedrock-runtime@^3.1050.0` vs `@aws-sdk/client-dynamodb@^3.750.0` (and lib-dynamodb, secrets-manager) |
| **Issue** | Large minor gap within v3; usually works but increases duplicate Smithy packages in `node_modules` and bundle size for Lambda. |
| **Recommendation** | Align all `@aws-sdk/*` to same minor via pnpm overrides or single bump. |

#### M-3 — Turbo `globalPassThroughEnv` incomplete vs CI

| | |
|---|---|
| **Location** | `turbo.json` — passes DynamoDB, Redis, Jira/HD secrets; **missing** `POSTGRES_URL`, `USE_MOCK_AI`, `JWT_*`, `BEDROCK_*` |
| **Issue** | Local `turbo test` may not forward Postgres URL unless set in shell; CI sets env at job level (works) but local Turbo cache keys may miss vars. |
| **Recommendation** | Add `POSTGRES_URL`, `USE_MOCK_AI` to `test.env` and `globalPassThroughEnv`. |

#### M-4 — Health check does not mark Postgres failure as degraded

| | |
|---|---|
| **Location** | `apps/api/src/services/health.service.ts` (lines 71–73) — `degraded` when `dynamodb === 'error' \|\| redis === 'error'` only; `postgres` reported but ignored for status |
| **Issue** | KB routes return 503 when Postgres down, but `/api/health/detail` can show `status: ok` with `postgres: error`. |
| **Recommendation** | Include Postgres in degraded calculation when `POSTGRES_URL` is configured. |

#### M-5 — Redis failure is silent for reports cache

| | |
|---|---|
| **Location** | `apps/api/src/services/redis-cache.service.ts` — `cacheGetJson` / `cacheSetJson` catch and return undefined / no-op |
| **Issue** | Reports still work but every request hits full `listAllTicketsForOrg` (see ARCHITECTURE_REVIEW). No metric that cache is down. |
| **Recommendation** | Acceptable degradation; add health dependency and optional log at `warn` once per interval. |

#### M-6 — WebSocket: no reconnect, silent errors

| | |
|---|---|
| **Location** | `apps/web/src/hooks/useWebSocket.ts` — reconnect only when `token` changes; `onerror` empty; no `onclose` retry |
| **Issue** | Transient network drop leaves feed stale until full page reload. `WS_MODE=gateway` — connection fails silently by design. |
| **Recommendation** | Exponential backoff reconnect (cap attempts); surface disconnected badge in `ActivitySidebar`. |

#### M-7 — Sync scripts exit non-zero but no structured outcome

| | |
|---|---|
| **Location** | `apps/api/src/scripts/jira-reconcile.ts`, `hd-reconcile.ts` — `main().catch` → `process.exitCode = 1`; partial page failures in HD concurrency can abort whole run |
| **Issue** | Jira/ME outage fails entire script; no resume checkpoint; HD runs sentiment + SLA scan even if sync partially failed. |
| **Recommendation** | Per-ticket error collection; exit code 1 if any failure; optional `--continue-on-error`. |

#### M-8 — Docker/local vs AWS drift risks

| | |
|---|---|
| **Location** | `docker-compose.yml` vs `infra/lib/*`; `DEPLOYMENT.md` |
| **Gaps** | |
| | • `amazon/dynamodb-local:latest` — **unpinned** image tag |
| | • Local Postgres: no SSL; production `rejectUnauthorized: false` (`postgres.client.ts` lines 11–15) |
| | • `DYNAMODB_ENDPOINT` set locally, unset in AWS — correct but easy to misconfigure |
| | • `USE_MOCK_AI=true` locally vs `false` prod — Bedrock behavior diverges |
| | • `WS_MODE=local` vs `gateway` — feature parity gap |
| | • Mailhog in compose, SES in prod — email paths differ |
| | • No RDS pgvector extension in compose (image includes it; RDS needs manual `CREATE EXTENSION`) |
| | • CDK `support_kb` Dynamo table vs runtime Postgres KB |
| **Recommendation** | Pin compose image digests; staging env mirrors production flags; document SSL/TLS expectations. |

#### M-9 — Conversation sync API amplification during reconcile

| | |
|---|---|
| **Location** | `jira-reconcile.ts` — per issue: `syncIssueComments` → Jira REST; `hd-reconcile.ts` — per ticket (×5 concurrent): `syncRequestConversations` → **2 HD calls** (`fetchRequestConversations` + `fetchRequestNotes`); `syncIssueComments.ts` — `listTicketComments(..., 500)` per stale row cleanup |
| **Issue** | Full sync at 10× tickets ≈ 10× external API calls; HD rate limit backoff helps but wall-clock grows. |
| **Recommendation** | Incremental sync default for cron; skip comment sync when `updatedAt` unchanged; batch comment fetch where APIs allow. |

#### M-10 — `buildAiTicketContext` loads up to 200 comments × 2 tickets per AI invoke

| | |
|---|---|
| **Location** | `apps/api/src/ai/buildTicketContext.ts` — `COMMENT_PAGE = 200`; linked ticket doubles Dynamo comment queries |
| **Issue** | Not N+1 loop but heavy read per `POST /api/ai/invoke`; pairs with full ticket load in briefing (`listHdTicketsWithSentiment`). |
| **Recommendation** | Cap AI context comments (e.g. last 30); paginate for display separately. |

#### M-11 — Production Postgres SSL `rejectUnauthorized: false`

| | |
|---|---|
| **Location** | `apps/api/src/db/postgres.client.ts` (lines 11–15) |
| **Issue** | MitM risk on RDS connection; common for AWS RDS with default cert but should use RDS CA bundle in strict environments. |
| **Recommendation** | Load `rds-ca-bundle.pem`; set `rejectUnauthorized: true` with proper CA. |

#### M-12 — `@usd/infra` test is a no-op

| | |
|---|---|
| **Location** | `infra/package.json` — `"test": "node -e \"process.exit(0)\""`; included in root `pnpm test` filter |
| **Issue** | CDK regressions caught only at manual synth/deploy. |
| **Recommendation** | `cdk synth` in CI; snapshot tests for critical resources. |

---

### LOW

#### L-1 — TypeScript strictness is strong; no `any` / `@ts-ignore` in app code

| | |
|---|---|
| **Location** | `tsconfig.base.json` — `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`; `eslint.config.mjs` — `strictTypeChecked`; grep: **no** `@ts-ignore` or `: any` in `apps/` |
| **Caveat** | Boundary casts remain: `as Record<string, unknown>` (Bedrock, Jira/HD JSON), `as unknown as Request` in tests, Dynamo `LastEvaluatedKey` casts — acceptable at integration boundaries. |
| **Recommendation** | Add ESLint `@typescript-eslint/no-unsafe-assignment` selectively on `apps/api/src/routes` if stricter enforcement desired. |

#### L-2 — Schema/type drift minor items

| | |
|---|---|
| **Location** | `packages/shared-types/src/index.ts` — inline `healthStatusSchema` vs `health/schemas.ts`; `loadEnv` missing `SUPPORT_WS_ACTIVITY_TABLE` (H-2); `getTicketsList` uses page pagination vs `.cursorrules` cursor convention |
| **Recommendation** | Single health schema export; align list API contract documentation. |

#### L-3 — Express 5 + React 18 — not latest majors

| | |
|---|---|
| **Location** | `apps/api` — `express@^5.0.1`; `apps/web` — `react@^18.3.1`, `vite@^5` |
| **Issue** | Express 5 is relatively new (ecosystem maturity); React 19 / Vite 6 available. Not blocking. |
| **Recommendation** | Planned upgrade after E2E + audit clean; test middleware compatibility. |

#### L-4 — `bcryptjs` vs native `bcrypt`

| | |
|---|---|
| **Location** | `apps/api/package.json` — `bcryptjs` (pure JS) |
| **Issue** | Slower than native binding; fine for auth scale at current size. |
| **Recommendation** | Keep unless profiling shows hotspot. |

#### L-5 — Duplicate `useTicketDetail` in view + content

| | |
|---|---|
| **Location** | `TicketDetailView.tsx` and `TicketDetailContent.tsx` both call `useTicketDetail` |
| **Issue** | TanStack Query dedupes network; duplicate loading UI logic. |
| **Recommendation** | Single owner for loading/error shell. |

#### L-6 — `placeholderData: (prev) => prev` on ticket list

| | |
|---|---|
| **Location** | `apps/web/src/hooks/useTickets.ts` (line 31) |
| **Issue** | Good UX for pagination/filter; keeps stale cards visible during refetch — intentional. |
| **Recommendation** | No change; ensure `isFetching` overlay remains (already in `TechnicianTicketsView`). |

#### L-7 — Infra `esbuild@^0.28.0` vs app transitive `0.21.5`

| | |
|---|---|
| **Location** | `infra/package.json` vs vitest/vite tree |
| **Issue** | Infra CDK bundling uses newer esbuild; app dev tree on older patched path via audit. |
| **Recommendation** | Resolve via Vite 6 upgrade. |

#### L-8 — Root `pnpm test` excludes e2e

| | |
|---|---|
| **Location** | Root `package.json` test script — no `@usd/e2e` |
| **Issue** | Easy to forget e2e before release. |
| **Recommendation** | Document in CONTRIBUTING; optional `test:all` script. |

---

## Failure modes matrix

| Dependency | When unreachable | Application behavior |
|------------|------------------|----------------------|
| **DynamoDB** | Down / throttled | Most routes throw → 500 `INTERNAL` or `AppError`; health → `degraded`; **no** circuit breaker |
| **Postgres** | Down / unset | KB routes: `requirePostgres` → **503** `KB_UNAVAILABLE`; health shows `postgres: error` but may still `ok` (M-4); browse/search KB fails |
| **Redis** | Down / unset | Health `redis: error` → **degraded**; reports cache miss → full ticket load; **app continues** |
| **Bedrock** | Timeout / error | Interactive AI: **degraded HTTP 200** (`ai/triage.ts`, `commentDraft.ts`, etc.); sentiment batch: **error counted, skipped** (`batchProcessor.ts`); no retry in `bedrock.service.ts` |
| **Jira API** | 4xx/5xx | Sync script fails; `postTicketComment` mirror fails → **local comment rolled back** (`tickets.handlers.ts` 186–196); webhooks still accept if already in Dynamo |
| **ManageEngine** | 4xx/5xx / 429 | `helpdeskFetchWithBackoff` retries 429; sync fails; comment mirror rollback same as Jira |
| **WebSocket** | Down | UI silent (`useWebSocket.ts`); queue works via REST; activity feed stale |
| **SMTP / Mailhog** | Unconfigured | Invite/reset/forgot return errors or generic failure; login unaffected |

**Startup failures:** Invalid env → `loadServerEnv()` throws `AppError` `CONFIG` 500 on first `getServerEnv()`. Production without JWT keys/ARN → Zod superRefine fails at startup.

---

## Configuration completeness

| Area | Implementation | Gap |
|------|----------------|-----|
| **Env validation** | Zod `serverEnvRefinedSchema` in `@usd/shared-types`; loaded in `loadEnv.ts` | H-2 missing keys; integration vars optional (warn-only via `checkEnvWarnings.ts`) |
| **Dev vs prod** | `ensureDevJwtKeys`, `USE_MOCK_AI`, `DYNAMODB_ENDPOINT`, `WS_MODE` | Documented in `DEPLOYMENT.md`; mock AI default can hide Bedrock misconfig until flip |
| **JWT** | RS256; inline PEM or `JWT_KEY_SECRET_ARN` | Ephemeral dev keys (H-3); WS passes token in query string (security review) |
| **CORS** | `apps/api/src/app.ts` | Not reviewed in depth — ensure production origin lockdown |
| **Rate limit** | 100/min/IP; webhooks exempt | Dev loopback bypass |

---

## pnpm / Turbo health

| Item | Status |
|------|--------|
| **packageManager** | `pnpm@9.15.9` pinned in root `package.json` |
| **Workspaces** | `apps/*`, `packages/*`, `infra` |
| **Turbo pipeline** | `build`, `dev`, `lint`, `typecheck`, `test`, `e2e` — sensible `dependsOn: ["^build"]` |
| **Remote cache** | Not configured (local only) |
| **Lockfile** | CI uses `--frozen-lockfile` |

---

## Performance summary

| Layer | Finding | Priority |
|-------|---------|----------|
| **Frontend bundle** | 1.2 MB single chunk; no code splitting | H-5 |
| **Ticket queue renders** | Full view on each WS event | H-6 |
| **API ticket list** | Full org load per request | ARCHITECTURE H-1 (cross-ref) |
| **AI context** | Up to 400 comments read per invoke (linked pair) | M-10 |
| **Reconcile** | O(tickets) external API calls for comments | M-9 |
| **React Query** | Sensible keys; `placeholderData` for smooth filters | Positive |

---

## Positive patterns to preserve

- **Strict TypeScript + ESLint `strictTypeChecked`** across monorepo.
- **Zod env schema** in shared-types with JWT refinement.
- **CI integration tests** with real DynamoDB Local + Postgres + Redis (not all mocks).
- **Frozen lockfile** and sequential quality gates.
- **Graceful shutdown** — `server/shutdown.ts` closes HTTP, WS, Redis, Postgres.
- **Redis cache best-effort** — reports degrade without hard failure.
- **Comment post rollback** when Jira/HD mirror fails.
- **HD 429 backoff** — `HELPDESK_429_RETRY_DELAYS_MS`.
- **Health probes** never throw — safe for load balancers.

---

## Suggested remediation order

1. **H-1** — Bump vitest/vite/turbo; add `pnpm audit` to CI.  
2. **H-2** — Fix `loadEnv` completeness.  
3. **H-4** — Playwright smoke in CI.  
4. **H-7** — Add API Dockerfile.  
5. **H-5 / H-6** — Bundle split + WS selector memoization.  
6. **H-3** — Stable JWT keys documented and enforced for shared envs.  
7. **M-4 / M-8** — Health accuracy + compose image pins.  
8. **M-12** — `cdk synth` in CI.

---

*Review performed without code changes. Re-run after dependency upgrades, Dockerfile addition, or CI pipeline expansion.*
