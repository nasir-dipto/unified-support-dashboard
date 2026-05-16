# Unified Support Dashboard — Claude Code Context

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
- Phase 5: IN PROGRESS — AI triage + action suggestion
- Phase 6: NOT STARTED — sentiment + briefings
- Phase 7: NOT STARTED — knowledge base (pgvector)
- Phase 8: NOT STARTED — reports + notifications
- Phase 9: NOT STARTED — admin + hardening

## Current test count: 74 (28 test files)

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
  USD-1 Epic, USD-2..11 Stories (USD-6 Done, USD-7 In Progress)
- Corporate: trialinteractive.atlassian.net/jira/software/projects/TAS
  TAS-2 Epic, TAS-3..12 Tasks (TAS-7 Done, TAS-8 In Progress)
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
