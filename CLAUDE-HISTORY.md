# USD Phase History (archived — Claude does not need to read this)

## Phase 0 — COMPLETE (PR #1)
- pnpm monorepo + Turborepo, GitHub Actions CI, AWS CDK stacks
- DynamoDB tables, SQS queues, ECS cluster, Redis, ECR

## Phase 1 — COMPLETE (PR #2)
- JWT RS256 auth, DynamoDB users/roles, LoginView, AuthGuard, RoleGuard
- 19 tests

## Phase 2 — COMPLETE (PR #3)
- Jira REST client (JQL search), tickets API, HMAC webhook, TicketCard
- TanStack Query, db:setup/seed/sync:jira scripts
- 47 tests

## Phase 3 — COMPLETE (PR #4)
- Zoho OAuth 2.0, HD REST client (SDP v3), HD webhook, purple badge
- pending status, customerEmail, internalId for HD API paths
- sync:hd script, 64 tests

## Phase 4 — COMPLETE (PR #5)
- WebSocket (ws package, /ws path, JWT auth), WS_MODE=local|gateway
- support_ticket_comments table, GET/POST comments, POST link
- Post comment syncs to Jira + HD (private note via request_note)
- DetailModal, ActivitySidebar (Zustand ring buffer last 50)
- H fix (hd_1 not hd_4445...), internalId field
- SQS Lambda handler, DLQ alarms, Lambda concurrency=10
- 74 tests

## Pre-Phase 5 improvements — COMPLETE (PR #6)
- Integration tests in CI (94 tests, 0 skipped)
- GET /api/health/detail endpoint
- Startup env var validation warnings
- DetailModal shows original ticket description
- HD description field synced from SDP v3
- Jira ADF converted to plain text

## UI Redesign — COMPLETE (PR #7)
- Full UI rebuilt matching docs/design-reference.tsx
- packages/ui: Badge, SlaBar, StatCard, Pill, Toggle, Overlay, StatusDot
- Role views: TechView (/tickets), MgrView (/manager), AdminView (/admin)
- JIRA_INCLUDE_PROJECTS: admin-configurable project filter (empty = all)
- 145 tests passing

## Phase 5A — COMPLETE (PR #8)
- Sync Jira comments + HD conversations during reconciliation
- commentSource: jira_comment | hd_note | hd_email | usd_comment
- Unified conversation thread in DetailModal (sorted ascending)
- Three reply options: Comment (Jira), Add Note (HD), Reply tomer (HD email)
- HELPDESK_EMAIL_REPLY_ENABLED flag
- HD ticket ID showing as HD-1 etc on TicketCard
- Jira assignee displayName fix, all 31 tickets showing (limit 100)
- Legacy comment cleanup script
- HD conversations API: GET /requests/{internalId}/conversations + notes merge
- commentSource values: jira_comment | hd_note | hd_email | usd_comment

## Phase 5B — COMPLETE (PR #9)
- POST /api/ai/invoke (triage_suggest + comment_draft + kb_draft + morning_briefing)
- bedrock.service.ts — Bedrock invocation, 10s timeout, USE_MOCK_AI=true fallback
- Server-side context: ticket + full comment thread + linked ticket
- Triage score ring on TicketCard (client-side, 0-100)
- AI Suggest Action + AI Draft Comment in DetailModal
- Tone pills: professional / empathetic / technical
- Degraded response on timeout (HTTP 200, manual review message)
- 214 tests passing

## Phase 6 — COMPLETE (PR #10)
- Sentiment analysis on HD tickets only (positive/neutral/negative + churnRisk)
- Dirty flag pattern (sentimentStale) + incremental + nightly batch
- 1-hour minimum re-analysis interval per ticket
- GET /api/sentiment/summary endpoint
- MgrView Sentiment tab — real Recharts (LineChart, BarChart, StackedBarChart)
- Morning briefing via POST /api/ai/invoke (morning_briefing)
- Sentiment badge on HD rds only
- pnpm sentiment:batch --full for nightly refresh
- 252 tests passing

## Phase 7 — COMPLETE (PR #11)
- PostgreSQL + pgvector (vector(1024), Titan amazon.titan-embed-text-v2:0)
- KB article CRUD + semantic search (top 3 results, cosine similarity)
- KB draft generation from HD + linked Jira context
- Manual trigger only (Generate KB Draft button)
- Embedding computed on publish only (not draft save)
- Admin + Manager KB tab (draft/publish workflow)
- Save as KB Draft persists state via API check on modal reopen
- Source ticket IDs shown in admin and search results
- pnpm kb:migrate script
- CI: pgvector service, POSTGRES_URL, kb:migrate before tests
- 269 tests passing

## Phase 8 — COMPLETE (PR #13)
- Reports: volume trend, resolution trend, SLA compliance, team performance
- Redis cache (1hr TTL) + CSV export on all reports
- SLA policy configurable (Admin → Settings)
- support_notifications DynamoDB table
- Notification bell (all roles), unread badge, dropdown
- WebSocket notifications in AppShell
- SLA breach + critical ticket + churn risk triggers
- Email service (nodemailer, Mailhog local, admin-configured SMTP)
- Admin → SMTP tab + Settings tab
- Source timestamps fix: Jira/HD original creation dates stored
- 293 tests passing

## Phase 9 — COMPLETE (PR #14)
- Permission model: technician/manager/super_admin enforced on all routes
- User management: invite flow, password reset, accept invite
- KB navigation tab (/kb) for all roles
- Demo credentials seeded: admin/manager/technician
- My Tickets default tab for technicians, read-only on unassigned
- Rate limiting: 100 req/min per IP
- ActivitySidebar history: loads lasnts on WS connect
- Merged incident view: linked Jira+HD tickets unified DetailModal
- 352 tests passing

## E2E Tests — COMPLETE (PR #15)
- Playwright E2E, 17 tests, Chromium only
- Video recording for all tests
- Run: pnpm e2e (requires pnpm dev)
- Excluded from CI

## Pre-deployment hardening — COMPLETE (PR #16)
- updatedAt guard on upsertTicket (prevents DLQ ordering bug)
- HD outbound rate limiting (100ms sleep, 429 backoff, concurrency 5)
- PostgreSQL SSL (ssl: rejectUnauthorized:false in production)
- Graceful shutdown (SIGTERM/SIGINT, 10s grace, closes WS/HTTP/PG/Redis)
- DynamoDB PITR enabled on all 10 tables (removalPolicy: RETAIN)
- Code coverage reporting (v8, non-blocking: 64% lines, 77% functions)
- 370 tests passing
