# Unified Support Dashboard — Claude Code Context


## Reference
- See CLAUDE-HISTORY.md for completed phase details (Phases 0-4)
## What this is
Standalone SaaS — aggregates Jira + ManageEngine HD tickets, AI triage, sentiment, KB, reports.

## Stack
- Frontend: React 18, TypeScript strict, Vite 5, React Router v6, Zustand, TanStack Query v5, Shadcn/ui, Tailwind
- Backend: Node.js 20, Express 5, TypeScript strict, Zod, AWS SDK v3
- Monorepo: pnpm workspaces + Turborepo
- Infra: AWS CDK (TypeScript)
- Testing: Vitest + RTL + Playwright

## Key conventions
- IDs: ULID. Never UUID
- Validation: Zod, import from packages/shared-types
- API errors: { error, code, statusCode }
- API lists: { data: T[], cursor?, total }
- All DynamoDB queries MUST include orgId in key condition
- All AI calls: POST /api/ai/invoke — never call Bedrock from frontend
- Never commit .env files or secrets

## Running locally
- docker compose up -d — start DynamoDB Local (:8000), Redis (:6379), Mailhog (:8025)
- pnpm dev — frontend (:5173) + backend (:3001)
- pnpm test — pnpm lint && pnpm typecheck — before every push
- pnpm --filter @usd/api db:setup — create DynamoDB Local tables
- pnpm --filter @usd/api db:seed — seed admin (admin@usd.dev / Admin123!)
- pnpm --filter @usd/api sync:jira — sync Jira tickets
- pnpm --filter @usd/api sync:hd — sync HD tickets
- export DYNAMODB_ENDPOINT=http://localhost:8000 && pnpm --filter @usd/api test

## Local service replacements
- DynamoDB → DynamoDB Local (:8000)
- Redis → Redis (:6379)
- Bedrock → Mock (USE_MOCK_AI=true)
- SES → Mailhog (:8025)

## Engineering practices
- Feature branch for every phase — never commit to develop or main directly
- Tests written same session as code — never deferred
- pnpm lint && pnpm typecheck && pnpm test before every push
- Small focused commits, conventional messages
- Update this CLAUDE.md after every phase

## Phase status
- Phase 0: COMPLETE — monorepo, CI, AWS CDK
- Phase 1: COMPLETE — JWT auth, users/roles, LoginView
- Phase 2: COMPLETE — Jira integration, tickets API, webhooks
- Phase 3: COMPLETE —  webhooks
- Phase 4: COMPLETE — WebSocket, DetailModal, ActivitySidebar, cross-linking
- Phase 5A: COMPLETE — comment sync + unified thread (branch: feature/phase-5-ai)
- Phase 5B: COMPLETE — AI triage, action suggestion, comment draft (branch: feature/phase-5b-ai)
- Phase 6: COMPLETE — sentiment + briefings (branch: feature/phase-6-sentiment)
- Phase 7: NOT STARTED — knowledge base (pgvector)
- Phase 8: NOT STARTED — reports + notifications
- Phase 9: NOT STARTED — admin + hardening

## Current test count: 94 (32 test files)

## Architecture decisions
- pgvector (RDS PostgreSQL) for KB search — not OpenSearch
- No TTL on tickets — keep all history
- metadata field on tickets for unknown custom fields
- Incremental sync: last 15 min only (not full sync)
- HD tickets: ticketId=hd_{display_id}, internalId for API paths
- WS_MODE=local (ws package) | gateway (API GW stub)
- Lambda concurrency: 10, DLQ alarms on both queues

## Permission model
- technician: own tickets = full access, others = read only
- manager: all tickets full access + reports + sentiment + AI
- super_admin: everything + user mgmt + integrations + delete
- Implementation deferre Local dev credentials
- Admin user: admin@usd.dev / Admin123! / orgId: demo-org
- Jira: dknasir007.atlassian.net (SCRUM project)
- HD: servicedeskplus.uk (display IDs hd_1 to hd_12)

## Jira project tracking
- Personal: dknasir007.atlassian.net/jira/software/projects/USD
  USD-1 Epic, USD-2..11 Stories (USD-8 Done, USD-9 In Progress — Phase 7)
- Corporate: trialinteractive.atlassian.net/jira/software/projects/TIAI
  TIAI-2 Epic, TIAI-3..12 Tasks (TIAI-9 Done, TIAI-10 In Progress — Phase 7)
  _(Corporate project key renamed from TAS → TIAI; issue numbers unchanged: TIAI-8 = Phase 5, etc.)_
- End of each phase: transition current story Done, next In Progress (both Jiras)

## Phase 5 — AI triage + action suggestion
### What to build
- apps/api/src/services/bedrock.service.ts — Bedrock invocation, 10s timeout, fallback. USE_MOCK_AI=true returns mock
- apps/api/src/routes/ai.routes.ts — POST /api/ai/invoke
- apps/api/src/ai/triage.ts — triage_suggest handler
- apps/api/src/ai/commentDraft.ts — comment_draft handler
- apps/api/src/ai/prompts.ts — prompt templates
- apps/web/src/utils/triage.ts — client-side score (0-100, neb/src/components/tickets/TicketCard.tsx — triage score ring
- apps/web/src/components/tickets/DetailModal.tsx — AI Suggest Action + AI Draft Comment buttons
- apps/web/src/api/ai.ts — typed fetch wrapper
- apps/web/src/hooks/useAI.ts — TanStack Query mutation

### Triage score (client-side)
priority: critical=40, high=30, medium=15, low=5
SLA: <25% adds up to 35pts (linear)
sentiment: negative+15, churnRisk+10
escalated: +10. Max=100

### Mock AI (USE_MOCK_AI=true)
- triage_suggest: realistic suggestion based on priority
- comment_draft: realistic draft comment

### Tests
- bedrock.service.ts unit (mock AWS SDK)
- triage.ts 100% coverage
- each AI handler unit test
- TicketCard triage ring component test
- DetailModal AI buttons component test

## Established patterns (always follow these)

### Adding a new API route
1. Zod schema in packages/shared-types/src/[domain]/schemas.ts
2. Handler in apps/api/src/routes/[domain].handlers.ts
3. Route registered in apps/api/src/routes/[domain].routes.ts
4. Mounted in apps/api/src/app.ts
5. Integration test in apps/api/src/[domain].integration.test.ts

### Adding a new external service
Follow jira.service.ts pattern:
- fetchX() methods only, no business logic
- All HTTP via helperFetch() with AppError on non-OK
- nock mocks in .test.ts, never real HTTP in tests
- Credentials from process.env via loadServerEnv()

### Adding a new frontend feature
1. Zod schema imported from packages/shared-types
2. API function in apps/web/src/api/[domain].ts
3. TanStack Query hook in apps/web/src/hooks/use[Domain].ts
4. Component in apps/web/src/components/[domain]/
5. RTL test alongside component

### Adding a new AI feature
1. Add feature name to AI feature union type in shared-types
2. Add prompt template in apps/api/src/ai/prompts.ts
3. Add handler in apps/api/src/ai/[feature].ts
4. Register in apps/api/src/routes/ai.routes.ts
5. Add mock response in bedrock.service.ts mock handler
6. Unit test for handler + mock response

### WebSocket broadcast (after any ticket mutation)
- Import broadcastTicketEvent from routes/ticket-broadcast.ts
- Call after upsertTicket succeeds
- Never broadcast before DB write confirms

### DynamoDB query rules
- Every Query MUST have orgId in KeyConditionExpression
- Every GetItem result MUST verify orgId matches JWT orgId
- Use upsertTicket for all ticket writes — never raw PutItem in routes

## Pending fixes (before Phase 5)
- DetailModal: show ticket.description as first item in conversation thread
  - Label: "Original Request" (HD) or "Issue Description" (Jira)
  - Show createdAt timestamp
  - Hide if description is empty or "—"
- Future (Phase 5+): sync full comment history from Jira/HD during reconciliation
- Future (Phase 9): attachment proxy for inline images in DetailModal

## Pre-Phase 5 improvements (in progress)
- Fix integration tests running in CI (add DYNAMODB_ENDPOINT to ci.yml test job)
- Add GET /api/health/detail endpoint (DynamoDB, Redis, WebSocket connections, version)
- Add startup env var validation warnings (missing JIRA_WEBHOOK_SECRET, HD_WEBHOOK_SECRET etc)

## Pre-Phase 5 improvements — COMPLETE (PR #6)
- Integration tests now run in CI (94 tests, 0 skipped)
- GET /api/health/detail endpoint
- Startup env var validation warnings
- DetailModal shows original ticket description
- HD description field synced from SDP v3
- Jira ADF converted to plain text

## Current test count: 94 (32 test files)

## UI Redesign — COMPLETE (PR #7)
- Full UI rebuilt matching docs/design-reference.tsx
- packages/ui: Badge, SlaBar, StatCard, Pill, Toggle, Overlay, StatusDot
- Role views: TechView (/tickets), MgrView (/manager), AdminView (/admin)
- All roles land on /tickets after login
- JIRA_INCLUDE_PROJECTS: admin-configurable project filter (empty = all)
- No mock data in production code
- No direct Anthropic calls from frontend
- 145 tests passing

## Current test count: 173 (38 API + 34 web + 8 UI + 7 shared-types)

## Phase 5A — Communication Enrichment — COMPLETE
### Goal
Sync full conversation history from Jira and HD so AI has rich context.

### Built
- Sync Jira comments during reconciliation: GET /rest/api/3/issue/{key}/comment
- Sync HD conversations during reconciliation: GET /requests/{internalId}/conversations
- `support_ticket_comments` includes `commentSource`: jira_comment, hd_note, hd_email, usd_comment
- DetailModal unified thread sorted by `createdAt` ascending with source badges
- Reply actions: Add Note (HD), Comment (Jira), Reply to Customer (HD email when `HELPDESK_EMAIL_REPLY_ENABLED=true`)
- Webhooks do **not** sync comments (reconcile only)

### HD conversations API (confirmed working)
- Endpoint: GET /requests/{internalId}/conversations?input_data={"list_info":{"row_count":50}}
- Returns type: NOTES or EMAIL (metadata only — **no `description` body** on list rows)
- Note bodies: GET /requests/{internalId}/notes (merge by `id` during sync)
- Requires Accept: application/vnd.manageengine.sdp.v3+json
- Email conversations only appear when HD mail server is configured

### Jira comments API
- Endpoint: GET /rest/api/3/issuey}/comment
- Returns comments array with author, body (ADF), created timestamp

### commentSource values
- jira_comment: comment from Jira issue
- hd_note: technician note from HD (show_to_requester: false)
- hd_email: customer email from HD (show_to_requester: true)
- usd_comment: comment posted through USD

## Phase 5A — COMPLETE (PR #8)
- Sync Jira comments + HD conversations during reconciliation
- commentSource: jira_comment | hd_note | hd_email | usd_comment
- Unified conversation thread in DetailModal (sorted ascending)
- Three reply options: Comment (Jira), Add Note (HD), Reply to Customer (HD email)
- HELPDESK_EMAIL_REPLY_ENABLED flag
- HD ticket ID showing as HD-1 etc on TicketCard
- Jira assignee displayName fix
- All 31 tickets showing (limit 100)
- Legacy comment cleanup script

## Phase 5B — COMPLETE
- POST /api/ai/invoke — triage_suggest + comment_draft (server-built context, no client context)
- Bedrock service (10s timeout, degraded HTTP 200 on failure); USE_MOCK_AI=true for local
- DetailModal: AI suggest action, AI draft comment, Pill tone toggle (professional/empathetic/technical)
- TicketCard: client-side triage score ring (0–100)
- shared-types: discriminated AI request/response (tone, degraded, suggestedAssignee)

## Phase 6 — COMPLETE
- HD-only sentiment (Bedrock batch, dirty flag, 1hr min interval)
- POST /api/ai/invoke `morning_briefing` (Overview + Sentiment tabs)
- GET /api/sentiment/summary — Recharts in MgrView Sentiment tab
- `pnpm sync:hd` runs incremental sentiment batch; `pnpm sentiment:batch` for full
- Sentiment badge on TicketCard (Helpdesk only)

## Current test count: 252 (172 API + 62 web + 8 UI + 11 shared-types)

## Deferred to Phase 6
- Webhook comment sync: when Jira/HD fires webhook for new comment, sync to support_ticket_comments
- Currently: reconciliation handles comment sync (not real-time)
- Phase 6 will add real-time comment sync via webhooks alongside sentiment analysis

## Phase 5B — COMPLETE (PR #9)
- POST /api/ai/invoke (triage_suggest + comment_draft)
- bedrock.service.ts — Bedrock invocation, 10s timeout, USE_MOCK_AI=true fallback
- Server-side context: ticket + full comment thread + linked ticket
- Triage score ring on TicketCard (client-side, 0-100)
- AI Suggest Action + AI Draft Comment in DetailModal
- Tone pills: professional / empathetic / technical
- Degraded response on timeout (HTTP 200, manual review message)
- 214 tests passing

## Phase 5 — COMPLETE (5A + 5B)
- Phase 5A: Communication enrichment (PR #8)
- Phase 5B: AI features (PR #9)

## Phase 6 — COMPLETE
- HD-only sentiment (Bedrock batch, dirty flag, 1hr min interval)
- POST /api/ai/invoke `morning_briefing` (Overview + Sentiment tabs)
- GET /api/sentiment/summary — Recharts in MgrView Sentiment tab
- `pnpm sync:hd` runs incremental sentiment batch; `pnpm sentiment:batch` for full
- Sentiment badge on TicketCard (Helpdesk only)

## Current test count: 252 (172 API + 62 web + 8 UI + 11 shared-types)

## Phase 6 — Sentiment Analysis & Briefings
### Architecture decisions (confirmed)

#### Sentiment scope
- HD tickets ONLY — customer-facing conversations
- Jira tickets: NO sentiment (internal engineering)
- Linked tickets: HD sentiment surfaces on Jira ticket in unified view (Phase 9)

#### When sentiment runs
- After sync:hd — set sentimentStale=true on updated tickets
- Batch runs after sync — analyses only sentimentStale=true tickets
- Nightly full batch — refreshes all HD tickets
- Minimum interval: never re-analyse same ticket more than once per hour
- NEVER call Bedrock per comment — batch only

#### Dirty flag pattern
- New comment/sync → sentimentStale=true (DynamoDB update only, instant)
- Batch picks up stale tickets → calls Bedrock once per ticket
- Clears sentimentStale=false after analysis

#### New ticket fields
- sentiment: positive | neutral | negative | null
- sentimentScore: -1.0 to +1.0 | null
- churnRisk: true | false
- sentimentStale: tntimentAt: ISO timestamp of last analysis

#### Charts (Recharts)
- Sentiment trend: LineChart (week by week)
- Tickets by sentiment: BarChart (filterable)
- Per-customer breakdown: BarChart with score
- Category breakdown: StackedBarChart

### What to build
- apps/api/src/services/sentiment.service.ts — Bedrock sentiment, USE_MOCK_AI fallback
- apps/api/src/scripts/sentiment-batch.ts — incremental + full batch processor
- apps/api/src/routes/sentiment.routes.ts — GET /api/sentiment/summary
- apps/api/src/ai/briefing.ts — morning briefing generator (morning_briefing feature)
- Update packages/shared-types tickets/schemas.ts — add sentiment fields
- Update apps/api/src/scripts/hd-reconcile.ts — set sentimentStale=true after sync
- Update apps/api/src/routes/webhooks.handlers.ts — set sentimentStale=true on HD webhook
- Fill MgrView Sentiment tab — real Recharts charts
- Sentiment badge on TicketCard (HD only)
- Morning briefing in Manager Overview tab
- POST /api/ai/invoke: add morning_briefinr

### What is NOT in Phase 6
- Webhook comment sync (real-time) — Phase 9
- Sentiment on Jira tickets — never (by design)
- Customer email reply — Phase 9 (mail server needed)
- Merged incident view — Phase 9
- Sentiment alerts/notifications — Phase 8
- Churn risk email to CSM — Phase 8

## Phase 6 — COMPLETE (PR #10)
- Sentiment analysis on HD tickets only (positive/neutral/negative + churnRisk)
- Dirty flag pattern (sentimentStale) + incremental + nightly batch
- GET /api/sentiment/summary endpoint
- MgrView Sentiment tab — real Recharts (LineChart, BarChart, StackedBarChart)
- Morning briefing via POST /api/ai/invoke (morning_briefing)
- Sentiment badge on HD TicketCards only
- 252 tests passing

## Current test count: 252
