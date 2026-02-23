import assert from 'node:assert';

import { mm, type MockApplication } from '@eggjs/mock';
import { detectPort } from 'detect-port';
import { HttpClient } from 'urllib';
import { describe, it, afterEach } from 'vitest';

import { getFilepath, cluster } from './utils.ts';

const httpclient = new HttpClient({ connect: { rejectUnauthorized: false } });

describe('test/https.test.ts', () => {
  let app: MockApplication;
  afterEach(mm.restore);

  describe('start https server with cluster options', () => {
    afterEach(() => app && app.close());

    it('should success with status 200', async () => {
      const port = await detectPort();
      const options = {
        baseDir: getFilepath('apps/https-server'),
        port,
        https: {
          key: getFilepath('server.key'),
          cert: getFilepath('server.cert'),
          ca: getFilepath('server.ca'),
        },
      };
      app = cluster('apps/https-server', options);
      await app.ready();

      const response = await httpclient.request(`https://127.0.0.1:${port}`, {
        dataType: 'text',
      });

      assert(response.status === 200);
      assert(response.data === 'https server');
    });

    it('should listen https and http at the same time', async () => {
      const port = await detectPort();
      const debugPort = await detectPort();
      const options = {
        baseDir: getFilepath('apps/https-server'),
        debugPort,
        port,
        https: {
          key: getFilepath('server.key'),
          cert: getFilepath('server.cert'),
          ca: getFilepath('server.ca'),
        },
      };
      app = cluster('apps/https-server', options);
      await app.ready();

      let response = await httpclient.request(`https://127.0.0.1:${port}`, {
        dataType: 'text',
      });
      assert(response.status === 200);
      assert(response.data === 'https server');

      response = await httpclient.request(`http://127.0.0.1:${debugPort}`, {
        dataType: 'text',
      });
      assert(response.status === 200);
      assert(response.data === 'https server');
    });
  });

  describe('start https server with app config cluster', () => {
    afterEach(() => app && app.close());

    it('should success with status 200', async () => {
      const port = await detectPort();
      const options = {
        baseDir: getFilepath('apps/https-server-config'),
        port,
      };

      app = cluster('apps/https-server-config', options);
      await app.ready();

      const response = await httpclient.request(`https://127.0.0.1:${port}`, {
        dataType: 'text',
      });

      assert(response.status === 200);
      assert(response.data === 'https server config');
    });
  });
});
