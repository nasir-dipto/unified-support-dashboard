import net from 'node:net';

/**
 * Sends Redis PING over RESP and resolves true when the server replies with PONG.
 */
export async function pingRedis(redisUrl: string): Promise<boolean> {
  let host = '127.0.0.1';
  let port = 6379;
  try {
    const parsed = new URL(redisUrl);
    host = parsed.hostname;
    if (parsed.port.length > 0) {
      port = Number(parsed.port);
    }
  } catch {
    return false;
  }
  if (!Number.isFinite(port) || port <= 0) {
    return false;
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.write('*1\r\n$4\r\nPING\r\n');
    });
    let buffer = '';
    const finish = (ok: boolean): void => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(2_000);
    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      if (buffer.includes('PONG')) {
        finish(true);
      }
    });
    socket.on('timeout', () => {
      finish(false);
    });
    socket.on('error', () => {
      finish(false);
    });
  });
}
