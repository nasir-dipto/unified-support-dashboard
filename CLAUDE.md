# Unified Support Dashboard — Claude Code Context

## What this is
A standalone SaaS web application that aggregates IT support tickets from Jira and ServiceDesk Plus into a single role-aware interface, with AI-powered triage, sentiment analysis, knowledge base, and custom reporting.

## Stack
- Frontend: React 18, TypeScript strict, Vite 5, React Router v6, Zustand, TanStack Query v5 (server state after Phase 1), Shadcn/ui, Tailwind CSS
- Backend: Node.js 20, Express 5, TypeScript strict, Zod, AWS SDK v3
- Monorepo: pnpm workspaces + Turborepo
- Infra: AWS CDK (TypeScript)
- Testing: Vitest + React Testing Library + Playwright

## Key conventions
- IDs: use ULID from the "ulid" package. Never UUID
- Validation: always Zod. Import from packages/shared-types
- API errors: { error: string, code: string, statusCode: number }
- API list responses: { data: T[], cursor?: string, total: number }
- All DynamoDB queries MUST include orgId in the key condition
- All AI calls go through POST /api/ai/invoke — never call Bedrock from frontend
- Never commit .env files or secrets

## Running the project
- pnpm dev — starts all apps
- pnpm test — runs all tests
- pnpm build — builds all apps
- pnpm lint — runs ESLint
- pnpm typecheck — runs TypeScript across the workspace (via Turborepo)

## Phase status
- Phase 0: COMPLETE — monorepo + CI + AWS infra
- Phase 1: COMPLETE — auth (login/refresh/logout/me, RS256 JWT, org-scoped Dynamo PK/SK + GSI orgId-email; forgot/reset stubbed; web: Tailwind + React Hook Form + Zustand)
- Phase 2: COMPLETE — Jira integration (TanStack Query for ticket server state on web)
- Phase 3: COMPLETE — Helpdesk (ManageEngine SDP Cloud + Zoho OAuth, webhooks, reconcile)
- Phase 4: NOT STARTED — real-time WebSocket
- Phase 5: NOT STARTED — AI triage + action suggestion
- Phase 6: NOT STARTED — sentiment + briefings
- Phase 7: NOT STARTED — knowledge base
- Phase 8: NOT STARTED — reports + notifications
- Phase 9: NOT STARTED — admin + hardening

## Engineering practices
- Always work on a feature branch — never commit directly to develop or main
- Scaffold with Claude Code first, then refine in Cursor
- Tests are written in the same session as the code — never deferred
- Run `pnpm lint && pnpm typecheck && pnpm test` before every push
- Use `/review` in Claude Code before opening every PR
- Small focused commits with conventional commit messages
- Never touch AWS console or GitHub browser for actions — CLI only
- Every production deploy goes through staging first
- Keep this CLAUDE.md updated after every phase and every convention decision

## Terminal layout (always running during development)
- Pane 1: pnpm dev:web
- Pane 2: pnpm dev:api
- Pane 3: pnpm test --watch
- Pane 4: free for git, aws, claude commands

## Local development strategy
- Everything runs locally first — AWS is only for staging and production
- Local services run via docker-compose.yml in project root
- Start local services: docker compose up -d
- Stop local services: docker compose down
- Environment variables control local vs AWS — never hardcode endpoints
- Local AI uses mock responses (USE_MOCK_AI=true) — no Bedrock calls during dev

## Local service replacements
- DynamoDB → DynamoDB Local (Docker, port 8000)
- Redis → Redis (Docker, port 6379)
- AWS Bedrock → Mock AI service (USE_MOCK_AI=true)
- AWS SES → Mailhog (Docker, port 1025 SMTP, port 8025 UI)

## Verify local services running
- aws dynamodb list-tables --endpoint-url http://localhost:8000
- docker exec usd-redis redis-cli ping
- open http://localhost:8025 (Mailhog UI)

## Phase 0 progress
### Done
- pnpm monorepo + Turborepo scaffolded (apps/web, apps/api, packages/shared-types, packages/ui, infra)
- Frontend Hello World running on http://localhost:5173
- Backend /health endpoint running on http://localhost:3001
- docker-compose.yml with DynamoDB Local (8000), Redis (6379), Mailhog (8025)
- .env.example with all local dev variables
- .env.local created locally (not committed)
- Shell switched to zsh, fnm configured, Node 20 + pnpm 9 active
- Claude Code running inside Cursor terminal
- GitHub Actions CI pipeline (.github/workflows/ci.yml) — lint → typecheck → test (DynamoDB Local + Redis) → build
- AWS CDK v2 stacks in `infra/` (UsdDatabase, UsdMessaging, UsdCompute, UsdCache) — synth-ready, not deployed

### Remaining
- Merge Phase 0 PR to develop (CI must be green first)

## Phase 0 — CI pipeline DONE
- .github/workflows/ci.yml created and passing (lint → typecheck → test → build)
- All 4 jobs green in 2m 12s
- Triggers on feature/** and hotfix/** pushes and PRs to develop/main

## AWS CDK (infra/) — code complete
- **UsdDatabaseStack** — DynamoDB tables: `support_tickets`, `support_users`, `support_roles`, `support_kb`, `support_reports`, `support_notification_rules` with GSIs per product spec
- **UsdMessagingStack** — `jira-events-queue`, `hd-events-queue`, each with DLQ and `maxReceiveCount: 3`
- **UsdComputeStack** — VPC (2 AZ, 1 NAT), `usd-cluster` ECS cluster, `usd-api` ECR repo, ECS task role (DynamoDB via table grants, Secrets Manager, SQS via queue grants, Bedrock, SES, OpenSearch/Serverless-style actions)
- **UsdCacheStack** — ElastiCache Serverless Redis (`usd-redis-serverless-dev`) in private subnets, SG allows 6379 from ECS task SG
- Tags: `Project=usd`, `Environment=dev` on all stacks; `pnpm --filter @usd/infra synth` seeds AZ context so synth works without `ec2:DescribeAvailabilityZones`

## Phase 0 — COMPLETE
Merged to develop via PR #1. Branch feature/phase-0-monorepo deleted.

## Phase 1 — IN PROGRESS
Authentication & user management.
Starting branch: feature/phase-1-auth

## Phase 1 — Auth details
### Goal
Build complete authentication so all future phases have a working user system to build on.

### What to build
- apps/api/src/utils/secrets.ts — fetch secrets from AWS Secrets Manager, cache in memory. In local dev read from .env.local instead
- apps/api/src/utils/jwt.ts — sign (RS256) and verify JWT using keys from secrets.ts
- apps/api/src/utils/errors.ts — AppError class with statusCode, message, code fields
- apps/api/src/db/dynamo.client.ts — DynamoDB DocumentClient, uses DYNAMODB_ENDPOINT env var for local dev
- apps/api/src/db/tables/users.ts — getUserByEmail, getUserById, createUser
- apps/api/src/db/tables/roles.ts — getSupportRole, setSupportRole, deleteSupportRole
- apps/api/src/routes/auth.routes.ts — POST /login, POST /refresh, POST /logout, POST /forgot-password, POST /reset-password
- apps/api/src/middleware/auth.middleware.ts — verifyJWT middleware
- apps/api/src/middleware/role.middleware.ts — requireRole(...roleb/src/store/auth.store.ts — Zustand store: accessToken, user, login(), logout(), refresh()
- apps/web/src/api/client.ts — Axios instance with Bearer token, 401 refresh interceptor
- apps/web/src/views/LoginView.tsx — login form with React Hook Form + Zod validation
- apps/web/src/components/layout/AuthGuard.tsx — redirects to /login if no token
- apps/web/src/components/layout/RoleGuard.tsx — redirects to /403 if wrong role
- apps/web/src/components/layout/AppShell.tsx — sidebar + header (empty nav for now)
- apps/web/src— React Router v6 routes with guards applied

### Local dev auth
- JWT keys generated locally as .env.local variables (not Secrets Manager)
- DynamoDB Local used for users and roles tables
- Refresh tokens stored in support_users table

### Tests required (same PR)
- Vitest unit tests for jwt.ts, errors.ts
- Vitest integration tests for all 5 auth routes using Supertest + DynamoDB Local
- React Testing Library test for LoginView

## Phase 1 — COMPLETE
Merged to develop via PR #2. Branch feature/phase-1-auth deleted.
- 19 tests passing (13 test files)
- JWT RS256 auth, DynamoDB users/roles, auth middleware, LoginView, AuthGuard, RoleGuard

## Phase 2 — Jira integration details
### Jira connection
- Jira Cloud URL: https://dknasir007.atlassian.net
- Auth: Basic Auth (`JIRA_EMAIL` + `JIRA_API_TOKEN`)
- Credentials stored in .env.local — never committed
- Connection verified: GET /rest/api/3/myself returns 200

### What to build
- apps/api/src/services/jira.service.ts — Jira REST API client
  - fetchProjects() — list all projects
  - fetchIssuesByProject(projectKey) — list issues with pagination
  - fetchSingleIssue(issueKey) — get one issue with comments
  - postComment(issueKey, body) — post comment back to Jira
  - transitionIssue(issueKey, transitionId) — change status
- apps/api/src/routes/tickets.routes.ts — GET /api/tickets, GET /api/tickets/:id
- apps/api/src/db/tables/tickets.ts — upsertTicket, getTicketById, listTickets
- apps/api/src/lambdas/sqsConsumer.ts — processes Jira / Helpdesk webhook JSON (SQS wiring later)
- apps/api/src/routes/tickets.handlers.ts — GET ticket handlers
- apps/api/src/routes/webhooks.routes.ts — POST `/api/webhooks/jira` (raw + HMAC), POST `/api/webhooks/helpdesk` (JSON + `x-sdp-webhook-secret`)
- apps/web/src/views/TicketsView.tsx — ticket list with TicketCard components
- apps/web/src/components/tickets/TicketCard.tsx — shows ticket summary, priority, status, source badge
- apps/web/src/hooks/useTickets.ts — TanStack Query hook for fetching tickets
- apps/web/src/api/tickets.ts — typed fetch wrapper for tickets API

### Field mapping (Jira → USD)
- issue.key → externalId (e.g. SUP-1)
- ticketId = "jira_" + issue.key
- issue.fields.summary → summary
- issue.fields.description → description
- issue.fields.priority.name → priority (map to critical/high/medium/low)
- issue.fields.status.name → status (map to open/in_progress/resolved/closed)
- issue.fields.assignee → assigneeId
- issue.fields.reporter → reporterId

### Local dev
- No SQS in local dev — webhook endpoint writes directly to DynamoDB Local
- JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_WEBHOOK_SECRET, JIRA_DEFAULT_ORG_ID loaded from .env.local
- Reconciliation sync runs manually via script for local dev

### Tests required
- Unit tests for jira.service.ts (mock HTTP with nock)
- Integrates (Supertest + DynamoDB Local)
- Component tests for TicketCard

## Phase 2 — COMPLETE
Merged to develop via PR #3. Branch feature/phase-2-jira deleted.
- 47 tests passing at Phase 2 merge (20 test files); suite expanded in Phase 3
- Jira REST client, tickets API, webhook, TicketCard UI, TanStack Query
- Real Jira tickets syncing from dknasir007.atlassian.net
- db:setup and db:seed scripts for local DynamoDB

## Phase 3 — COMPLETE
Helpdesk (ManageEngine ServiceDesk Plus Cloud) via Zoho OAuth; all HD REST calls use `HELPDESK_URL` only (no `zohoapis` host). Token refresh: `https://accounts.${ZOHO_DOMAIN}/oauth/v2/token` (default `zoho.uk`).

### Env (API)
- `HELPDESK_URL`, `ZOHO_DOMAIN`, `HD_CLIENT_ID`, `HD_CLIENT_SECRET`, `HD_REFRESH_TOKEN`, `HD_DEFAULT_ORG_ID`, `HD_WEBHOOK_SECRET` (see `.env.example`)

### Implemented
- `apps/api/src/services/zohoAuth.service.ts` — cached access token + refresh before expiry
- `apps/api/src/services/helpdesk.service.ts` — authenticated `helpdeskFetch`, `fetchRequestsPage`, `fetchSingleRequest`
- `apps/api/src/helpdesk/mapRequestToTicket.ts` — HD → USD (`source: helpdesk`, `ticketId` = `hd_` + id, On Hold → `pending`, `customerEmail` from requester)
- `apps/api/src/routes/webhooks.handlers.ts` + `webhooks.routes.ts` — `POST /api/webhooks/jira` (unchanged behavior), `POST /api/webhooks/helpdesk` (`x-sdp-webhook-secret`)
- `apps/api/src/scripts/hd-reconcile.ts` — `pnpm --filter @usd/api sync:hd`
- `packages/shared-types` — `helpdesk/schemas.ts`, ticket schema: `pending`, optional `customerEmail`
- Web: `TicketCard` — purple Helpdesk badge, grey `pending` status chip

### HD field mapping (HD → USD)
- request.id → externalId; ticketId = `hd_` + id
- request.subject → summary; request.description → description
- request.status.name → status (On Hold → `pending`; open/in_progress/resolved/closed)
- request.priority.name → priority
- request.technician.name → assigneeId
- request.requester.email_id → customerEmail (and reporterId when set)

### Local dev
- Webhook → DynamoDB Local directly; `enqueueSqsEvent('helpdesk.webhook', …)` stub only

### Tests
- nock: `zohoAuth.service.test.ts`, `helpdesk.service.test.ts`; unit: `mapRequestToTicket.test.ts`, `webhooks.handlers.test.ts`, `sqsConsumer` Helpdesk path
- Integration: `tickets.integration.test.ts` (Helpdesk webhook + list when `DYNAMODB_ENDPOINT` is set)
