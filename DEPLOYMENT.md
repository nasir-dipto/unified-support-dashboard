# USD AWS Deployment Guide

## Status: PRE-DEPLOYMENT — awaiting DevOps prerequisites
See TPDI project in Jira for all prerequisite sub-tasks assigned to Nasir Hossain Dipto.

## Target environment
- AWS Account: 044789783871 (ndipto)
- Region: us-east-1
- Staging URL: TBD (CloudFront or subdomain of trialinteractive.com)
- Production URL: TBD

## Prerequisites checklist (must be complete before deployment)
- [ ] VPC ID and subnet IDs provided (TPDI sub-task 1)
- [ ] Security groups created (TPDI sub-task 2)
- [ ] IAM roles created with correct permissions (TPDI sub-task 3)
- [ ] RDS PostgreSQL provisioned + pgvector enabled (TPDI sub-task 4)
- [ ] ElastiCache Redis provisioned (TPDI sub-task 5)
- [ ] ECR repository created + push access configured (TPDI sub-task 6)
- [ ] All secrets stored in Secrets Manager (TPDI sub-task 7)
- [ ] Bedrock model access approved for both models (TPDI sub-task 8)
- [ ] Domain + SSL certificate configured (TPDI sub-task 9)
- [ ] Corporate ra + HD credentials ready (TPDI sub-task 10)
- [ ] ALB configured (TPDI sub-task 11)

## Deployment order (follow strictly)
Step 1: CDK deploy infrastructure (VPC import, DynamoDB, SQS, ECR, ECS cluster)
Step 2: Build Docker image + push to ECR
Step 3: Deploy ECS service with USE_MOCK_AI=true (no Bedrock yet)
Step 4: Run kb:migrate against RDS (CREATE EXTENSION vector must be done first)
Step 5: Verify frontend loads, login works, DynamoDB tables exist
Step 6: Run initial sync (sync:jira + sync:hd — limited scope first)
Step 7: Request Bedrock model access if not approved, then flip USE_MOCK_AI=false
Step 8: Configure internal SMTP via Admin → SMTP tab
Step 9: Register Jira + HD webhooks pointing to ALB URL
Step 10: Run full sentiment batch + verify reports
Step 11: CloudWatch alarms verification
Step 12: Production deployment after staging verified

## Known failure points (be proactive)

### RDS PostgreSQL
- pgvector extension MUST be enabled manually after RDS creation:
  `CREATE EXTENSION IF NOT EXISTS vector;` on usd_kb database
- SSL is enabled automatically in `postgres.client.ts` when `NODE_ENV=production` (RDS self-signed cert)
- `POSTGRES_URL` does not need `?ssl=true` in Secrets Manager — use standard `postgresql://user:pass@host:5432/usd_kb`
- ECS must be in same VPC as RDS (private subnet)

### IAM permissions
- Missing permissions cause silent 403 errors at runtime
- App starts fine but features fail unexpectedly
- Test each feature after deployment: tickets, AI, KB, reports

### Bedrock
- Models must be enabled in us-east-1 specifically
- USE_MOCK_AI=false must be set in production env vars
- Models needed: anthropic.claude-3-5-sonnet-20241022-v2:0 + amazon.titan-embed-text-v2:0

### CloudFront
- MUST add custom error response: 404 → /index.html with 200 status
- Without this, direct URL navigation (/kb, /manager) shows CloudFront error
- React Router requires this for client-side routing to work

### Security groups
- ECS → RDS: port 5432 must be open
- ECS → Redis: port 6379 must be open
- ECS → AWS APIs (DynamoDB, Bedrock, Secrets Manager): port 443 outbound
- ALB → ECS: port 3001 en

### Environment variables
- JWT_PRIVATE_KEY + JWT_PUBLIC_KEY: generate stable RSA keys (not ephemeral)
  Ephemeral keys = every ECS restart logs everyone out
- VITE_API_URL: must be set to ALB URL before frontend build
- USE_MOCK_AI: must be false in production

### Initial data sync
- First sync:jira could pull thousands of tickets — run during off-hours
- First sync:hd + sentiment batch = large Bedrock cost — run after hours
- Set JIRA_INCLUDE_PROJECTS to limit scope for initial sync

### WebSocket (WS_MODE)
- Local: WS_MODE=local (ws package on Express)
- AWS: WS_MODE=gateway (API Gateway WebSocket) — needs separate CDK stack
- Alternative: keep WS_MODE=local with sticky sessions on ALB (simpler)
- Decision needed before deployment

## Environment variables — local vs production mapping
| Variable | Local | Production source |
|---|---|---|
| JWT_PRIVATE_KEY | empty (ephemeral) | Secrets Manager: usd/jwt |
| JWT_PUBLIC_KEY | empty (ephemeral) | Secrets Manager: usd/jwt |
| JIRA_BASE_URL | dknatlassian.net | Secrets Manager: usd/jira |
| JIRA_API_TOKEN | personal token | Secrets Manager: usd/jira |
| JIRA_USER_EMAIL | personal email | Secrets Manager: usd/jira |
| JIRA_WEBHOOK_SECRET | local secret | Secrets Manager: usd/jira |
| HD_BASE_URL | servicedeskplus.uk | Secrets Manager: usd/helpdesk |
| ZOHO_CLIENT_ID | personal | Secrets Manager: usd/helpdesk |
| ZOHO_CLIENT_SECRET | personal | Secrets Manager: usd/helpdesk |
| ZOHO_REFRESH_TOKEN | personal | Secrets Manager: usd/helpdesk |
| HD_WEBHOOK_SECRET | local secret | Secrets Manager: usd/helpdesk |
| POSTGRES_URL | localhost:5432 | Secrets Manager: usd/db |
| DYNAMODB_ENDPOINT | http://localhost:8000 | NOT SET (uses real AWS) |
| USE_MOCK_AI | true | false |
| REDIS_URL | redis://localhost:6379 | ElastiCache endpoint |
| VITE_API_URL | http://localhost:3001 | https://[alb-dns-name] |

## CDK stacks (already written)
- UsdDatabaseStack — DynamoDB tables, SQS queues
- UsdComputeStack — ECS Fargate, ECR, ALB
- UsdCacheStack — ElastiCache
- UsdInfraStack — VPC import, security groups

## WebSocket decision needed
Before deployment, decide:
- Option A: WS_MODE=local + ALB sticky sessions (simpler, works for small scale)
- Option B: WS_MODE=gateway + API Gateway WebSocket (scalable, more complex)
Recommendation: Option A for staging, revisit for production.

## Post-deployment tasks
- Create RUNBOOK.md for operational procedures
- Document how to add a new organisation
- Document manual resync procedure
- Set up CloudWatch dashboard
- Configure billing alerts
