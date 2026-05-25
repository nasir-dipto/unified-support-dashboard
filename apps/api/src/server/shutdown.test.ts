import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { registerGracefulShutdown } from './shutdown.js';

describe('registerGracefulShutdown', () => {
  afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  it('registers SIGTERM and SIGINT handlers', () => {
    const beforeTerm = process.listenerCount('SIGTERM');
    const beforeInt = process.listenerCount('SIGINT');
    const server = http.createServer();
    registerGracefulShutdown({ server });
    expect(process.listenerCount('SIGTERM')).toBe(beforeTerm + 1);
    expect(process.listenerCount('SIGINT')).toBe(beforeInt + 1);
    server.close();
  });
});
