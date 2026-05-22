import { ulid } from 'ulid';
import type {
  CreateKbArticleBody,
  KbArticle,
  KbSearchResult,
  UpdateKbArticleBody,
} from '@usd/shared-types';
import type { AiTicketContext } from '../ai/types.js';
import { formatContextForPrompt } from '../ai/formatContextForPrompt.js';
import { queryPostgres } from '../db/postgres.client.js';
import { AppError } from '../utils/errors.js';
import {
  buildKbArticleEmbedText,
  embedText,
  formatVectorLiteral,
} from './embedding.service.js';

type KbRow = {
  kb_id: string;
  org_id: string;
  title: string;
  problem: string;
  root_cause: string;
  resolution_steps: string;
  tags: string[];
  source_ticket_ids: string[];
  status: 'draft' | 'published';
  created_by: string;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
};

/**
 * Maps a Postgres row to API KB article shape.
 */
function rowToArticle(row: KbRow): KbArticle {
  return {
    kbId: row.kb_id,
    orgId: row.org_id,
    title: row.title,
    problem: row.problem,
    rootCause: row.root_cause,
    resolutionSteps: row.resolution_steps,
    tags: row.tags,
    sourceTicketIds: row.source_ticket_ids,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    publishedAt: row.published_at !== null ? row.published_at.toISOString() : null,
  };
}

export type ListKbArticlesFilter = {
  status?: 'draft' | 'published';
  /** When set, only articles whose source_ticket_ids contain this ticket id. */
  sourceTicketId?: string;
};

/**
 * Lists KB articles for an org with optional status and source ticket filters.
 */
export async function listKbArticles(
  orgId: string,
  filter?: ListKbArticlesFilter,
): Promise<KbArticle[]> {
  const conditions = ['org_id = $1'];
  const params: unknown[] = [orgId];
  let paramIndex = 2;
  if (filter?.status !== undefined) {
    conditions.push(`status = $${String(paramIndex)}`);
    params.push(filter.status);
    paramIndex += 1;
  }
  if (filter?.sourceTicketId !== undefined && filter.sourceTicketId.length > 0) {
    conditions.push(`$${String(paramIndex)} = ANY(source_ticket_ids)`);
    params.push(filter.sourceTicketId);
    paramIndex += 1;
  }
  const sql = `SELECT * FROM kb_articles WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`;
  const rows = await queryPostgres<KbRow>(sql, params);
  return rows.map(rowToArticle);
}

/**
 * Fetches one KB article scoped to orgId.
 */
export async function getKbArticle(orgId: string, kbId: string): Promise<KbArticle> {
  const rows = await queryPostgres<KbRow>(
    `SELECT * FROM kb_articles WHERE org_id = $1 AND kb_id = $2`,
    [orgId, kbId],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new AppError('KB article not found', 'NOT_FOUND', 404);
  }
  return rowToArticle(row);
}

/**
 * Creates a draft KB article (no embedding).
 */
export async function createKbArticle(
  orgId: string,
  userId: string,
  body: CreateKbArticleBody,
): Promise<KbArticle> {
  const kbId = ulid();
  const now = new Date();
  const rows = await queryPostgres<KbRow>(
    `INSERT INTO kb_articles (
      kb_id, org_id, title, problem, root_cause, resolution_steps,
      tags, source_ticket_ids, status, created_by, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10,$10)
    RETURNING *`,
    [
      kbId,
      orgId,
      body.title,
      body.problem,
      body.rootCause,
      body.resolutionSteps,
      body.tags,
      body.sourceTicketIds,
      userId,
      now,
    ],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new AppError('Failed to create KB article', 'INTERNAL', 500);
  }
  return rowToArticle(row);
}

/**
 * Updates a draft KB article (embedding unchanged until publish).
 */
export async function updateKbArticle(
  orgId: string,
  kbId: string,
  patch: UpdateKbArticleBody,
): Promise<KbArticle> {
  const existing = await getKbArticle(orgId, kbId);
  const title = patch.title ?? existing.title;
  const problem = patch.problem ?? existing.problem;
  const rootCause = patch.rootCause ?? existing.rootCause;
  const resolutionSteps = patch.resolutionSteps ?? existing.resolutionSteps;
  const tags = patch.tags ?? existing.tags;
  const sourceTicketIds = patch.sourceTicketIds ?? existing.sourceTicketIds;
  const now = new Date();
  const rows = await queryPostgres<KbRow>(
    `UPDATE kb_articles SET
      title = $3, problem = $4, root_cause = $5, resolution_steps = $6,
      tags = $7, source_ticket_ids = $8, updated_at = $9
    WHERE org_id = $1 AND kb_id = $2
    RETURNING *`,
    [orgId, kbId, title, problem, rootCause, resolutionSteps, tags, sourceTicketIds, now],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new AppError('KB article not found', 'NOT_FOUND', 404);
  }
  return rowToArticle(row);
}

/**
 * Deletes a KB article scoped to orgId.
 */
export async function deleteKbArticle(orgId: string, kbId: string): Promise<void> {
  const rows = await queryPostgres<{ kb_id: string }>(
    `DELETE FROM kb_articles WHERE org_id = $1 AND kb_id = $2 RETURNING kb_id`,
    [orgId, kbId],
  );
  if (rows.length === 0) {
    throw new AppError('KB article not found', 'NOT_FOUND', 404);
  }
}

/**
 * Publishes a draft: computes Titan embedding and sets status published.
 */
export async function publishKbArticle(orgId: string, kbId: string): Promise<KbArticle> {
  const article = await getKbArticle(orgId, kbId);
  const embedInput = buildKbArticleEmbedText({
    title: article.title,
    problem: article.problem,
    rootCause: article.rootCause,
    resolutionSteps: article.resolutionSteps,
    tags: article.tags,
  });
  const vector = await embedText(embedInput);
  const literal = formatVectorLiteral(vector);
  const now = new Date();
  const rows = await queryPostgres<KbRow>(
    `UPDATE kb_articles SET
      status = 'published', embedding = $3::vector, published_at = $4, updated_at = $4
    WHERE org_id = $1 AND kb_id = $2
    RETURNING *`,
    [orgId, kbId, literal, now],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new AppError('KB article not found', 'NOT_FOUND', 404);
  }
  return rowToArticle(row);
}

/**
 * Semantic search: top 3 published articles for org by ticket context embedding.
 */
export async function searchKbByTicket(
  orgId: string,
  ctx: AiTicketContext,
): Promise<KbSearchResult[]> {
  const queryText = formatContextForPrompt(ctx);
  const vector = await embedText(queryText);
  const literal = formatVectorLiteral(vector);
  const rows = await queryPostgres<{
    kb_id: string;
    title: string;
    problem: string;
    source_ticket_ids: string[];
    similarity: number;
  }>(
    `SELECT kb_id, title, problem, source_ticket_ids,
      1 - (embedding <=> $1::vector) AS similarity
    FROM kb_articles
    WHERE org_id = $2 AND status = 'published' AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT 3`,
    [literal, orgId],
  );
  return rows.map((r) => ({
    kbId: r.kb_id,
    title: r.title,
    problem: r.problem,
    similarity: Math.max(0, Math.min(1, r.similarity)),
    sourceTicketIds: r.source_ticket_ids,
  }));
}

/**
 * Lists published KB articles for browse (optional title/tag search).
 */
export async function listPublishedKbArticles(
  orgId: string,
  options?: { q?: string; limit?: number },
): Promise<KbArticle[]> {
  const limit = options?.limit ?? 50;
  const q = options?.q?.trim();
  if (q !== undefined && q.length > 0) {
    const pattern = `%${q}%`;
    const rows = await queryPostgres<KbRow>(
      `SELECT * FROM kb_articles
       WHERE org_id = $1 AND status = 'published'
         AND (title ILIKE $2 OR problem ILIKE $2 OR $3 = ANY(tags))
       ORDER BY published_at DESC NULLS LAST, updated_at DESC
       LIMIT $4`,
      [orgId, pattern, q, limit],
    );
    return rows.map(rowToArticle);
  }
  const rows = await queryPostgres<KbRow>(
    `SELECT * FROM kb_articles
     WHERE org_id = $1 AND status = 'published'
     ORDER BY published_at DESC NULLS LAST, updated_at DESC
     LIMIT $2`,
    [orgId, limit],
  );
  return rows.map(rowToArticle);
}

/**
 * Fetches a published KB article for read-only browse.
 */
export async function getPublishedKbArticle(orgId: string, kbId: string): Promise<KbArticle> {
  const article = await getKbArticle(orgId, kbId);
  if (article.status !== 'published') {
    throw new AppError('KB article not found', 'NOT_FOUND', 404);
  }
  return article;
}
