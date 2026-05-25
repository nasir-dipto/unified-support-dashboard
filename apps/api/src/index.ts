import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnvFile } from 'dotenv';
import { WebSocketServer } from 'ws';
import { createApp } from './app.js';
import { checkEnvWarnings } from './config/checkEnvWarnings.js';
import { ensureDevJwtKeys } from './config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv } from './config/loadEnv.js';
import { registerGracefulShutdown } from './server/shutdown.js';
import { registerLocalWsClient } from './services/websocket.service.js';
import { verifyAccessToken } from './utils/jwt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads `.env.local` from the monorepo root and the API package (missing files are ignored).
 */
function loadLocalDotenv(): void {
  const apiRoot = join(__dirname, '..');
  const repoRoot = join(__dirname, '../../..');
  loadEnvFile({ path: join(repoRoot, '.env.local') });
  loadEnvFile({ path: join(apiRoot, '.env.local'), override: true });
}

loadLocalDotenv();
ensureDevJwtKeys();
loadServerEnv();
checkEnvWarnings();
const app = createApp();
const env = getServerEnv();

const server = http.createServer(app);
let wss: WebSocketServer | undefined;

if (env.WS_MODE === 'local') {
  wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (request, socket, head) => {
    const host = request.headers.host ?? '127.0.0.1';
    let url: URL;
    try {
      url = new URL(request.url ?? '/', `http://${host}`);
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const token = url.searchParams.get('token');
    if (token === null || token.length === 0) {
      socket.destroy();
      return;
    }
    void verifyAccessToken(token)
      .then((payload) => {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          registerLocalWsClient(payload.orgId, ws);
        });
      })
      .catch(() => {
        socket.destroy();
      });
  });
}

registerGracefulShutdown({ server, wss });

server.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${String(env.PORT)}`);
});
