import { strict as assert } from 'node:assert';
import { createConnection } from 'node:net';

import { mm } from '@eggjs/mock';
import { detectPort } from 'detect-port';
import { HttpClient } from 'urllib';
import { afterEach, describe, it } from 'vitest';

import { cluster, getFilepath } from './utils.ts';

const httpclient = new HttpClient({ connect: { rejectUnauthorized: false } });

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') {
        resolve(false);
      } else {
        reject(err);
      }
    });
    socket.setTimeout(2000, () => socket.destroy(new Error('Timed out checking the closed listener')));
  });
}

describe('test/debug-port.test.ts', () => {
  let app: ReturnType<typeof cluster> | undefined;

  afterEach(async () => {
    try {
      await app?.close();
    } finally {
      app = undefined;
      await mm.restore();
    }
  });

  it.each([
    { name: 'HTTP without a hostname', protocol: 'http', hostname: '' },
    { name: 'HTTP with an explicit hostname', protocol: 'http', hostname: '127.0.0.1' },
    { name: 'HTTPS', protocol: 'https', hostname: '' },
  ])('serves both ports and closes them for $name', async ({ protocol, hostname }) => {
    const port = await detectPort();
    const debugPort = await detectPort();
    assert.notEqual(port, debugPort);
    mm(process.env, 'EGG_TEST_CLUSTER_DEBUG_HOSTNAME', hostname);

    const options = {
      workers: 1,
      port,
      debugPort,
      ...(protocol === 'https'
        ? {
            https: {
              key: getFilepath('server.key'),
              cert: getFilepath('server.cert'),
              ca: getFilepath('server.ca'),
            },
          }
        : {}),
    };
    app = cluster('apps/http-debug-server', options);
    await app.ready();

    const primary = await httpclient.request(`${protocol}://127.0.0.1:${port}`, { dataType: 'text' });
    const debug = await httpclient.request(`http://127.0.0.1:${debugPort}`, { dataType: 'text' });
    assert.equal(primary.status, 200);
    assert.equal(debug.status, 200);
    assert.equal(primary.data, 'debug-port server');
    assert.equal(debug.data, primary.data);

    await app.close();
    app = undefined;
    assert.equal(await isPortOpen(port), false);
    assert.equal(await isPortOpen(debugPort), false);
  });
});
