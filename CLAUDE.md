# Unified Support Dashboard — Claude Code Context

## Reference
- See CLAUDE-HISTORY.md for completed phase details (Phases 0-9)
- See DEPLOYMENT.md for AWS deployment checklist and failure points

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
- All AI calls: POST /api/aioke — never call Bedrock from frontend
- Never commit .env files or secrets

## Running locally
- docker compose up -d — start all local services
- pnpm dev — frontend (:5173) + backend (:3001)
- pnpm lint && pnpm typecheck && pnpm test — before every push
- export DYNAMODB_ENDPOINT=http://localhost:8000 && pnpm test — run with integration tests
- pnpm e2e — Playwright E2E (requires docker compose up -d + pnpm dev)
- pnpm --filter @usd/api db:setup — create all tables (DynamoDB + PostgreSQL)
- pnpm --filter @usd/api db:seed — seed 3 demo users
- pnpm --filter @usd/api sync:jira — full Jira sync (all issues per project)
- pnpm --filter @usd/api sync:jira:incremental — Jira incremental sync (last 15 min, `updated > -15m`)
- pnpm --filter @usd/api sync:hd — full HD sync + conversations + sentiment batch
- pnpm --filter @usd/api sync:hd:incremental — HD incremental sync (last 15 min, `last_updated_time`)
- Custom window: `pnpm --filter @usd/api sync:jira -- --since=30` (or `sync:hd`)
- pnpm --filter @usd/api sentiment:batch — full sentiment refresh

## Local services (docker compose up -d)
- DynamoDB Local: port 8000 (persisted in dynamodb_data volume)
- Redis: port 6379
- Mailhog: port 8025 (email UI at http://localhost:8025)
- PostgreSQL (pgvector): port 5432 (persisted in postgres_data volume)

## Local dev replacements
- Bedrock → Mock (USE_MOCK_AI=true)
- SES → not used (internal SMT# Engineering practices
- Feature branch for every phase — never commit to develop or main directly
- Tests written same session as code — never deferred
- pnpm lint && pnpm typecheck && pnpm test before every push
- Small focused commits, conventional messages
- Update CLAUDE.md after every phase (archive to CLAUDE-HISTORY.md)

## Phase status
- Phases 0-9: ALL COMPLETE — see CLAUDE-HISTORY.md
- Phase 10: IN PROGRESS — AWS Deployment (waiting for DevOps prerequisites in TPDI)

## Current test count
- Unit/integration: 370 (233 API + 104 web + 24 shared-types + 9 UI)
- E2E: 17 Playwright tests (pnpm e2e)
- Coverage baseline: 64% lines, 77% functions, 68% branches (@usd/api)

## Demo credentials (seeded, shown on login in dev mode)
- Super Admin: admin@usd.dev / Admin123! / orgId: ti
- Manager:     manager@usd.dev / Mgr123!
- Technician:  technician@usd.dev / Tech123!

## Permission model
- technician: assigned tickets full write, others read-only, KB browse
- manager: all tickets full write, rsentiment, AI, list users
- super_admin: everything + user invite + settings + SMTP + delete

## Navigation by role
- Technician: Tickets | Knowledge Base
- Manager: Tickets | Knowledge Base | Manager
- Super Admin: Tickets | Knowledge Base | Manager | Admin

## Architecture decisions
- pgvector (RDS PostgreSQL) for KB — not OpenSearch (~$15-25/mo)
- No TTL on tickets — keep all history
- metadata field for unknown custom Jira/HD fields
- Incremental sync: `--incremental` (15 min) or `--since=N`; full sync is default
- Jira incremental JQL: `updated > -Nm ORDER BY updated DESC`
- HD incremental filter: `list_info.search_criteria.last_updated_time > timestamp_ms`
- HD tickets: ticketId=hd_{display_id}, internalId for API paths
- WS_MODE=local | gateway (API GW, AWS deployment)
- Lambda concurrency: 10, DLQ alarms on both queues
- Sentiment: HD only, dirty flag + batch (never per-comment Bedrock)
- KB embeddings: computed on publish only
- JIRA_INCLUDE_PROJECTS: empty = all projects
- Rate limiting: 100 req/min per IP (skip: /api/health, /api/webhooks/*)
- SLA policy: Critical=2h, High=4h, Medium=8h, Low=24h (configurable in Admin)
- updatedAt guard on upsertTicket (stale events skip core fields)
- HD rate limiting: 100ms sleep, 429 backoff, concurrency 5
- PostgreSQL SSL: handled in code (ssl: rejectUnauthorized:false in production)
- Graceful shutdown: SIGTERM/SIGINT with 10s grace period
- DynamoDB PITR: enabled on all 10 tables (removalPolicy: RETAIN)

## Local dev Jira/HD
- Jira: dknasir007.atlassian.net (SCRUM + USD projects)
- HD: servicedeskplus.uk (display IDs hd_1 to hd_12)

## Jira project tracking
- Personal: dknasir007.atlassian.net/jira/software/projects/USD
  USD-11 Done (Phase 9 complete) | USD-12 In Progress (Phase 10 — AWS Deployment)
- Corporate: trialinteractive.atlassian.net/jira/software/projects/TIAI
  TIAI-12 Done (Phase 9 complete) | TIAI-13 In Progress (Phase 10 — AWS Deployment)
- TPDI: DevOps prerequisites for Phase 10 (11 sub-tasks)
- End of each phase: transition current story Done, next In Progress (both Jiras)

## Phase 10 — AWS DeploPROGRESS)
- Waiting for: TPDI DevOps sub-tasks (VPC, SGs, IAM, RDS, Redis, ECR, Secrets, Bedrock, Domain, Jira/HD creds, ALB)
- See DEPLOYMENT.md for full checklist and known failure points
- AWS Account: 044789783871, Region: us-east-1
- No staging/production split — single environment

## Deferred to post-AWS deployment
- Split view + full UI redesign (sortable columns, keyboard shortcuts, bulk actions)
- Attachment proxy for inline images
- Webhook real-time comment sync
- Mobile responsive improvements
- RUNBOOK.md — create after first deployment

## Established patterns (always follow these)

### Adding a new API route
1. Zod schema in packages/shared-types/src/[domain]/schemas.ts
2. Handler in apps/api/src/routes/[domain].handlers.ts
3. Route registered in apps/api/src/routes/[domain].routes.ts
4. Mounted in apps/api/src/app.ts
5. Integration test in apps/api/src/[domain].integration.test.ts

### Adding a new external service
Follow jira.service.ts pattern:
- fetchX() methods only, no business log All HTTP via helperFetch() with AppError on non-OK
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

## Corporate Jira integration — COMPLETE (PR #17)
- Switched to trialinteractive.atlassian.net
- Syncing 6 projects: SPROJ, TILMS, TPDI, TRL, STM, TIAI
- JIRA_ASSIGNEE_FILTER support (optional assignee filter in JQL)
- orgId renamed from demo-org to ti across all config/production code
- HD still on personal instance (servicedeskplus.uk) until Phase 10
