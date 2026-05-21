# Unified Support Dashboard — Claude Code Context

## Reference
- See CLAUDE-HISTORY.md for completed phase details (Phases 0-7)

## What this is
Standalone SaaS — aggregates Jira + ManageEngine HD tickets, AI triage, sentiment, KB, reports.

## Stack
- Frontend: React 18, TypeScript strict, Vite 5, React Router v6, Zustand, TanStack Query v5, Shadcn/ui, Tailwind
- Backend: Node.js 20, Express 5, TypeScript strict, Zod, AWS SDK v3
- Monorepo: pnpm workspaces + Turborepo
- Infra: AWS CDK (TypeScript)
- Database: DynamoDB (tickets/users/comments), PostgreSQL+pgvector (KB articles)
- Testing: Vitest + RTL

## Key conventions
- IDs: ULID. Never UUID
- Validation: Zod, import from packages/shared-types
- API errors: { error, code, statusCode }
- API lists: { data: T[], cursor?, total }
- All DynamoDB queries MUST include orgId in key condition
- All AI calls: POST /api/ai/invoke — never call Bedrock from frontend
- Never commit .env files or secrets

## Running locally
- docker compose up -d — start all local services
- pnpm dev — frontend (:5173) + backend (:3001)
- pnpm lint && pnpm typecheck && pnpm test — before every push
- export DYNAMODB_ENDPOINT=http://localhost:8000 && pnpm test — run with integration tests
- pnpm --filter @usd/api db:setup — create DynamoDB Local tables (first time, or fresh volume)
- pnpm --filter @usd/api db:seed — seed admin (admin@usd.dev / Admin123!) (first time, or fresh volume)
- pnpm --filter @usd/api kb:migrate — run PostgreSQL migrations (first time only)
- pnpm --filter @usd/api sync:jira — sync Jira tickets + comments
- pnpm --filter @usd/api sync:hd — sync HD tickets + conversations + sentiment batch
- pnpm --filter @usd/api sentiment:batch — full sentiment refresh

## Local services (docker compose up -d)
- DynamoDB Local: port 8000 — data persisted in Docker volume `dynamodb_data` (survives `docker compose down` / `up`; run db:setup + db:seed + sync once on a new volume)
- Redis: port 6379
- Mailhog: port 8025 (email UI)
- PostgreSQL (pgvector): port 5432

## Local dev replacements
- Bedrock → Mock (USE_MOCK_AI=true)
- SES → Mailhog (:8025)

## Engineering practices
- Feature branch for every phase — never commit to deests written same session as code — never deferred
- pnpm lint && pnpm typecheck && pnpm test before every push
- Small focused commits, conventional messages
- Update CLAUDE.md after every phase (archive completed details to CLAUDE-HISTORY.md)

## Phase status
- Phases 0-7: COMPLETE — see CLAUDE-HISTORY.md
- Phase 8: IN PROGRESS — reports + notifications
- Phase 9: NOT STARTED — admin + hardening + AWS deployment

## Current test count: 269 (179 API + 66 web + 16 shared-types + 8 UI)

## Architecture decisions
- pgvector (RDS PostgreSQL) for KB search — not OpenSearch (~$15-25/mo)
- No TTL on tickets — keep all history for KB/sentiment/reports
- metadata field on tickets for unknown custom Jira/HD fields
- Incremental sync: last 15 min only (not full sync)
- HD tickets: ticketId=hd_{display_id}, internalId for API paths
- WS_MODE=local (ws package) | gateway (API GW stub, Phase 9)
- Lambda concurrency: 10, DLQ alarms on both queues
- Sentiment: HD only, dirty flag + batch (never per-comment Bedrock)
- KB embeddings: computed on publish only (not draft save)
- JIRA_INCLUDE_PROJECTS: empty = all projects (admin sets in Phase 9)

## Permission model (enforced in Phase 9)
- technician: own tickets = full access, others = read only
- manager: all tickets full access + reports + sentiment + AI + KB review
- super_admin: everything + user mgmt + integrations + delete
- Current: admin role has full access (role enforcement deferred to Phase 9)

## Local dev credentials
- Admin user: admin@usd.dev / Admin123! / orgId: demo-org
- Jira: dknasir007.atlassian.net (SCRUM + USD projects)
- HD: servicedeskplus.uk (display IDs hd_1 to hd_12)

## Jira project tracking
- Personal: dknasir007.atlassian.net/jira/software/projects/USD
  USD-1 Epic — USD-9 Done (Phase 7), USD-10 In Progress (Phase 8)
- Corporate: trialinteractive.atlassian.net/jira/software/projects/TIAI
  TIAI-2 Epic — TIAI-10 Done (Phase 7), TIAI-11 In Progress (Phase 8)
- End of each phase: transition current story Done, next In Progress (both Jiras)

## Established patterns (always follow these)

### Adding a new API route
1. Zod schema in packages/shared-types/src/.ts
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
5. Add mock response in ai/mockResponses.ts
6. Unit test for handler + mock response

### WebSocket broadcast (after any ticket mutation)
- Import broadcastTicketEvent from routes/ticket-broadcast.ts
- Call after upsertTicket succeeds
- Never broadcast before DB write confirms

### DynamoDB query rules
- Every Query MUST have orgId in KeyConditionExpression
- Every GetItem result MUST verify orgId matches JWT orgId
- Use upsertTicket for all ticket writes — never raw PutItem in routes

## Deferred items
- Webhook comment sync (real-time) — Phase 9
- Merged incident view (Jira+HD unified modal) — Phase 9
- Customer email reply via HD — Phase 9 (mail server needed)
- ActivitySidebar history on connect — Phase 9
- Attachment proxy for inline images — Phase 9
- Permission model enforcement — Phase 9

## Phase 8 — Reports ### Architecture decisions (to be confirmed before building)
- Reports: real-time computed on GET vs Redis-cached vs pre-computed nightly
- Notification triggers: SLA breach (reconciliation check), churn risk (post-sentiment batch), critical ticket (webhook)
- Email: AWS SES locally via Mailhog (already running)
- Notification recipients: technician (own SLA), manager (churn/critical/digest), super_admin (everything)

### What to build
- GET /api/reports/sla — SLA compliance by week/month
- GET /api/reports/volume — ticket volume by source and period
- GET /api/reports/resolution — avg resolution time by priority/source
- GET /api/reports/team — tickets resolved per technician
- apps/api/src/services/email.service.ts — SES/Mailhog email sender
- apps/api/src/services/notifications.service.ts — notification rules engine
- apps/api/src/routes/notifications.routes.ts — GET/POST /api/notifications
- Update reconciliation: check SLA breach → trigger notification
- Update sentiment batch: churn risk detected → trigger notification
- Fill MgrView Reporting tab with real Recharts
- In-app notification bell in header (WebSocket push)
- Notification preferences in Admin settings
