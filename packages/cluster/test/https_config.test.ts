import assert from 'node:assert';

import { mm, type MockApplication } from '@eggjs/mock';
import { detectPort } from 'detect-port';
import { HttpClient } from 'urllib';
import { describe, it, afterEach } from 'vitest';

import { cluster, getFilepath } from './utils.ts';

const httpclient = new HttpClient({ connect: { rejectUnauthorized: false } });

describe('test/https.test.ts', () => {
  let app: MockApplication;
  afterEach(mm.restore);

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
