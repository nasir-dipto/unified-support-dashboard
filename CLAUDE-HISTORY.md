# USD Phase History (archived — Claude does not need to read this)

## Phase 0 — COMPLETE (PR #1)
- pnpm monorepo + Turborepo, GitHub Actions CI, AWS CDK stacks
- DynamoDB tables, SQS queues, ECS cluster, Redis, ECR

## Phase 1 — COMPLETE (PR #2)
- JWT RS256 auth, DynamoDB users/roles, LoginView, AuthGuard, RoleGuard
- 19 tests

## Phase 2 — COMPLETE (PR #3)
- Jira REST client (JQL search), tickets API, HMAC webhook, TicketCard
- TanStack Query introduced, db:setup/seed/sync:jira scripts
- 47 tests

## Phase 3 — COMPLETE (PR #4)
- Zoho OAuth 2.0, HD REST client (SDP v3), HD webhook, purple badge
- pending status, customerEmail, internalId for HD API paths
- sync:hd script, 64 tests

## Phase 4 — COMPLETE (PR #5)
- WebSocket (ws package, /ws path, JWT auth), WS_MODE=local|gateway
- support_ticket_comments table, GET/POST comments, POST link
- Post comment syncs to Jira + HD (private note via request_note)
- DetailModal, ActivitySidebar (Zustand ring buffer ladisplay ID fix (hd_1 not hd_4445...), internalId field
- SQS Lambda handler, DLQ alarms, Lambda concurrency=10
- 74 tests
