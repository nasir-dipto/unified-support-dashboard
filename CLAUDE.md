# Unified Support Dashboard — Claude Code Context

## What this is
A standalone SaaS web application that aggregates IT support tickets from Jira and ServiceDesk Plus into a single role-aware interface, with AI-powered triage, sentiment analysis, knowledge base, and custom reporting.

## Stack
- Frontend: React 18, TypeScript strict, Vite 5, React Router v6, Zustand, TanStack Query v5, Shadcn/ui, Tailwind CSS
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
- Phase 0: IN PROGRESS — monorepo + CI + AWS infra
- Phase 1: NOT STARTED — auth
- Phase 2: NOT STARTED — Jira integration
- Phase 3: NOT STARTED — Helpdesk integration
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
