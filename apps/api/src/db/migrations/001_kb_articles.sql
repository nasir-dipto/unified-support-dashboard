CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS kb_articles (
  kb_id VARCHAR(26) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL,
  title VARCHAR(500) NOT NULL,
  problem TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  resolution_steps TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_ticket_ids TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(1024),
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published')),
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS kb_articles_org_status_idx ON kb_articles (org_id, status);
