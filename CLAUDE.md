# Unified Support Dashboard — Claude Code Context

## Reference
- See CLAUDE-HISTORY.md for completed phase details (Phases 0-9)

## What this is
Standalone SaaS — aggregates Jira + ManageEngine HD tickets, AI triage, sentiment, KB, reports.

## Stack
- Frontend: React 18, TypeScript strict, Vite 5, React Router v6, Zustand, TanStack Query v5, Shadcn/ui, Tailwind
- Backend: Node.js 20, Express 5, TypeScript strict, Zod, AWS SDK v3
- Monorepo: pnpm workspaces + Turborepo
- Infra: AWS CDK (TypeScript)
- Database: DynamoDB (tickets/users/comments/notifications), PostgreSQL+pgvector (KB articles)
- Testing: Vitest + RTL (unit) + Playwright (E2E)

## Key conventions
- IDs: ULID. Never UUID
- Validation: Zod, import from packages/shared-types
- API errors: { error, code, statusCode }
- API lists: { data: T[], cursor?, total }
- All DynamoDB queries MUST include orgId in key condition
- All AI calls: POST /api/ai/invoke — never call Bedrock from frontend
- Never commit .env fileecrets

## Running locally
- docker compose up -d — start all local services
- pnpm dev — frontend (:5173) + backend (:3001)
- pnpm lint && pnpm typecheck && pnpm test — before every push
- export DYNAMODB_ENDPOINT=http://localhost:8000 && pnpm test — run with integration tests
- pnpm e2e — Playwright E2E (requires docker compose up -d + pnpm dev)
- pnpm --filter @usd/api db:setup — create all tables (DynamoDB + PostgreSQL)
- pnpm --filter @usd/api db:seed — seed 3 demo users
- pnpm --filter @usd/api sync:jira — sync Jira tickets + comments
- pnpm --filter @usd/api sync:hd — sync HD tickets + conversations + sentiment batch
- pnpm --filter @usd/api sentiment:batch — full sentiment refresh

## Local services (docker compose up -d)
- DynamoDB Local: port 8000 (persisted in dynamodb_data volume)
- Redis: port 6379
- Mailhog: port 8025 (email UI at http://localhost:8025)
- PostgreSQL (pgvector): port 5432 (persisted in postgres_data volume)

## Local dev replacements
- Bedrock → Mock (USE_MOClhog (:8025)

## Engineering practices
- Feature branch for every phase — never commit to develop or main directly
- Tests written same session as code — never deferred
- pnpm lint && pnpm typecheck && pnpm test before every push
- Small focused commits, conventional messages
- Update CLAUDE.md after every phase (archive to CLAUDE-HISTORY.md)

## Phase status — ALL COMPLETE
- Phases 0-9: complete — see CLAUDE-HISTORY.md
- E2E: 17 Playwright tests with video recording

## Current test count
- Unit/integration: 352 (215 API + 104 web + 24 shared-types + 9 UI)
- E2E: 17 Playwright tests (pnpm e2e)

## Demo credentials (seeded, shown on login in dev mode)
- Super Admin: admin@usd.dev / Admin123! / orgId: demo-org
- Manager:     manager@usd.dev / Mgr123!
- Technician:  technician@usd.dev / Tech123!

## Permission model
- technician: assigned tickets full write, others read-only, KB browse
- manager: all tickets full write, reports, sentiment, AI, list users
- super_admin: everything + user invite + settiTP + delete

## Navigation by role
- Technician: Tickets | Knowledge Base
- Manager: Tickets | Knowledge Base | Manager
- Super Admin: Tickets | Knowledge Base | Manager | Admin

## Architecture decisions
- pgvector (RDS PostgreSQL) for KB — not OpenSearch (~$15-25/mo)
- No TTL on tickets — keep all history
- metadata field for unknown custom Jira/HD fields
- Incremental sync: last 15 min only
- HD tickets: ticketId=hd_{display_id}, internalId for API paths
- WS_MODE=local | gateway (API GW, AWS deployment)
- Lambda concurrency: 10, DLQ alarms on both queues
- Sentiment: HD only, dirty flag + batch (never per-comment Bedrock)
- KB embeddings: computed on publish only
- JIRA_INCLUDE_PROJECTS: empty = all projects
- Rate limiting: 100 req/min per IP (skip: /api/health, /api/webhooks/*)
- SLA policy: Critical=2h, High=4h, Medium=8h, Low=24h (configurable in Admin)

## Local dev Jira/HD
- Jira: dknasir007.atlassian.net (SCRUM + USD projects)
- HD: servicedeskplus.uk (display IDs hd_1 to hd_12)

## Jira projtracking
- Personal: dknasir007.atlassian.net/jira/software/projects/USD
  USD-11 In Progress (Phase 9 — AWS deploy pending)
- Corporate: trialinteractive.atlassian.net/jira/software/projects/TIAI
  TIAI-12 In Progress (Phase 9 — AWS deploy pending)

## Next: AWS Deployment
- Create DEPLOYMENT.md when starting AWS deployment
- CDK deploy to staging, connect corporate Jira + HD
- USE_MOCK_AI=false → real Bedrock
- RDS PostgreSQL, AWS SES, CloudWatch alarms
- Production after staging verified

## Deferred to post-AWS deployment
- Split view + full UI redesign (sortable columns, keyboard shortcuts, bulk actions)
- Attachment proxy for inline images
- Webhook real-time comment sync
- Mobile responsive improvements
- RUNBOOK.md — operational runbook after first deployment

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
1. Add feature name to AI feature union type in shared-type prompt template in apps/api/src/ai/prompts.ts
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

## Pre-deployment hardening — COMPLETE (PR #16)
- updatedAt guard on upsertTicket (stale events skip core fields, sentiment always updates)
- HD outbound rate limiting (100ms sleep, 429 backoff, concurrency limit 5)
- PostgreSQL SSL (ssl: rejectUnauthorized:false in production)
- Graceful shutdown (SIGTERM/SIGINT, 10s grace, closes WS/HTTP/PG/Redis)
- DynamoDB PITR enabled on all 10 tables (removalPolicy: RETAIN)
- Code coverage reporting (v8, non-blocking baseline: 64% lines, 77% functions)
- 370 tests passing (233 API + 104 web + 24 shared-types + 9 UI)

## Current test count: 370 (233 API + 104 web + 24 shared-types + 9 UI) + 17 E2E
