import { Redis } from 'ioredis';
import { getServerEnv } from '../config/loadEnv.js';

let client: Redis | undefined;

/**
 * Returns a shared Redis client when REDIS_URL is configured.
 */
export function getRedisClient(): Redis | undefined {
  const env = getServerEnv();
  if (env.REDIS_URL === undefined || env.REDIS_URL.length === 0) {
    return undefined;
  }
  if (client === undefined) {
    client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
  }
  return client;
}

/**
 * Resets Redis client (Vitest only).
 */
export function resetRedisClientForTests(): void {
  if (client !== undefined) {
    client.disconnect();
    client = undefined;
  }
}

/**
 * Closes the shared Redis connection (graceful shutdown).
 */
export async function closeRedisClient(): Promise<void> {
  if (client === undefined) {
    return;
  }
  const active = client;
  client = undefined;
  if (active.status === 'wait') {
    return;
  }
  try {
    await active.quit();
  } catch {
    active.disconnect();
  }
}

/**
 * Reads JSON from cache; returns undefined on miss or Redis unavailable.
 */
export async function cacheGetJson<T>(key: string): Promise<T | undefined> {
  const redis = getRedisClient();
  if (redis === undefined) {
    return undefined;
  }
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const raw = await redis.get(key);
    if (raw === null || raw.length === 0) {
      return undefined;
    }
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * Stores JSON in cache with TTL seconds.
 */
export async function cacheSetJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (redis === undefined) {
    return;
  }
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // cache is best-effort
  }
}
