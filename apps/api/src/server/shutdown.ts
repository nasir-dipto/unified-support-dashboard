import type http from 'node:http';
import type { WebSocketServer } from 'ws';
import { closePostgresPool } from '../db/postgres.client.js';
import { closeRedisClient } from '../services/redis-cache.service.js';
import { closeAllLocalWsClients } from '../services/websocket.service.js';

const SHUTDOWN_GRACE_MS = 10_000;

export type GracefulShutdownDeps = {
  server: http.Server;
  wss?: WebSocketServer | undefined;
};

let shutdownInProgress = false;

/**
 * Closes HTTP server, WebSockets, Postgres pool, and Redis; exits after grace period.
 */
export async function performGracefulShutdown(
  deps: GracefulShutdownDeps,
  signal: string,
): Promise<void> {
  if (shutdownInProgress) {
    return;
  }
  shutdownInProgress = true;
  console.info(`Shutdown: received ${signal}, stopping new connections`);

  const forceExitTimer = setTimeout(() => {
    console.warn('Shutdown: grace period elapsed, forcing exit');
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);
  forceExitTimer.unref();

  try {
    console.info('Shutdown: closing WebSocket connections');
    closeAllLocalWsClients();
    if (deps.wss !== undefined) {
      await new Promise<void>((resolve, reject) => {
        deps.wss?.close((err) => {
          if (err !== undefined) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }

    console.info('Shutdown: closing HTTP server');
    await new Promise<void>((resolve, reject) => {
      deps.server.close((err) => {
        if (err !== undefined) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    console.info('Shutdown: closing PostgreSQL pool');
    await closePostgresPool();

    console.info('Shutdown: closing Redis connection');
    await closeRedisClient();

    console.info('Shutdown: complete');
    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (err: unknown) {
    console.error('Shutdown: error during graceful shutdown', err);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

/**
 * Registers SIGTERM and SIGINT handlers for graceful shutdown.
 */
export function registerGracefulShutdown(deps: GracefulShutdownDeps): void {
  const onSignal = (signal: NodeJS.Signals): void => {
    void performGracefulShutdown(deps, signal);
  };
  process.once('SIGTERM', onSignal);
  process.once('SIGINT', onSignal);
}
