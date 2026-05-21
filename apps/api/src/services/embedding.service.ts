import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getServerEnv } from '../config/loadEnv.js';
import { isMockAiEnabled } from './bedrock.service.js';

/** Titan embed v2 dimension count. */
export const EMBEDDING_DIMENSION = 1024;

const EMBED_TIMEOUT_MS = 10_000;

let embedClient: BedrockRuntimeClient | undefined;

/**
 * Deterministic mock embedding from text (USE_MOCK_AI or tests).
 */
export function mockEmbedding(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    const idx = i % EMBEDDING_DIMENSION;
    vec[idx] = (vec[idx] ?? 0) + (text.charCodeAt(i) % 97) / 100;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/**
 * Formats a float array for pgvector literal binding.
 */
export function formatVectorLiteral(values: number[]): string {
  return `[${values.map((v) => String(v)).join(',')}]`;
}

/**
 * Lazily constructs Bedrock client for embeddings.
 */
function getEmbedClient(): BedrockRuntimeClient {
  if (embedClient === undefined) {
    const env = getServerEnv();
    embedClient = new BedrockRuntimeClient({ region: env.AWS_REGION });
  }
  return embedClient;
}

/**
 * Invokes Titan embed model and returns a 1024-dim vector.
 */
export async function embedText(text: string): Promise<number[]> {
  if (isMockAiEnabled()) {
    return mockEmbedding(text);
  }

  const env = getServerEnv();
  const body = JSON.stringify({ inputText: text.slice(0, 8000) });
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, EMBED_TIMEOUT_MS);

  try {
    const out = await getEmbedClient().send(
      new InvokeModelCommand({
        modelId: env.BEDROCK_EMBED_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(body),
      }),
      { abortSignal: controller.signal },
    );
    const raw = new TextDecoder().decode(out.body);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Invalid embed response');
    }
    const embedding = (parsed as { embedding?: unknown }).embedding;
    if (!Array.isArray(embedding)) {
      throw new Error('Embed response missing embedding array');
    }
    const nums = embedding.filter((v): v is number => typeof v === 'number');
    if (nums.length !== EMBEDDING_DIMENSION) {
      throw new Error(`Expected ${String(EMBEDDING_DIMENSION)} dims, got ${String(nums.length)}`);
    }
    return nums;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Builds searchable text from a KB article for embedding at publish time.
 */
export function buildKbArticleEmbedText(article: {
  title: string;
  problem: string;
  rootCause: string;
  resolutionSteps: string;
  tags: string[];
}): string {
  return [
    article.title,
    article.problem,
    article.rootCause,
    article.resolutionSteps,
    article.tags.join(' '),
  ].join('\n\n');
}
