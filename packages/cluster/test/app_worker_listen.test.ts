import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { request } from '@eggjs/supertest';
import { ip } from 'address';
import urllib from 'urllib';
import { describe, it, afterEach, beforeEach } from 'vitest';

import { cluster } from './utils.ts';

// node v24 will hang when test this file
// FIXME: should enable this test after node v24 is stable
describe.skipIf(process.version.startsWith('v24') || process.platform === 'win32')('test/app_worker.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app && app.close());
  afterEach(mm.restore);

  describe('listen config', () => {
    const sockFile = path.join(tmpdir(), `egg-app-listen-path-${process.pid}-${randomBytes(4).toString('hex')}.sock`);
    beforeEach(async () => {
      mm.env('default');
      await rm(sockFile, { force: true });
    });
    afterEach(async () => {
      await app.close();
      await mm.restore();
    });
    afterEach(() => rm(sockFile, { force: true }));

    it.skip('should set default port 170xx then config.listen.port is null', async () => {
      app = cluster('apps/app-listen-without-port');
      // app.debug();
      await app.ready();

      app.expect('code', 0);
      app.expect('stdout', /egg started on http:\/\/127.0.0.1:\d+/);
      // app.expect('stderr', /port should be number, but got null/);
    });

    it.skip('should use port in config', async () => {
      app = cluster('apps/app-listen-port', { port: 0 });
      // app.debug();
      await app.ready();

      app.expect('code', 0);
      app.expect('stdout', /egg started on http:\/\/127.0.0.1:17010/);

      await request('http://0.0.0.0:17010').get('/').expect('done').expect(200);

      await request('http://127.0.0.1:17010').get('/').expect('done').expect(200);

      await request('http://localhost:17010').get('/').expect('done').expect(200);

      await request('http://127.0.0.1:17010').get('/port').expect('17010').expect(200);

      // ipv6
      // await request('http://[::1]:17010')
      //   .get('/')
      //   .expect('done')
      //   .expect(200);
      // await request('http://[::1]:17010')
      //   .get('/port')
      //   .expect('17010')
      //   .expect(200);
    });

    it.skip('should use hostname in config', async () => {
      const url = ip() + ':17010';

      app = cluster('apps/app-listen-hostname', { port: 0 });
      // app.debug();
      await app.ready();

      app.expect('code', 0);
      app.expect('stdout', new RegExp(`egg started on http://${url}`));

      await request(url).get('/').expect('done').expect(200);

      try {
        const response = await urllib.request('http://127.0.0.1:17010', {
          dataType: 'text',
        });
        assert(response.status === 200);
        assert(response.data === 'done');
        throw new Error('should not run');
      } catch (err: any) {
        assert(/ECONNREFUSED/.test(err.message));
      }
    });

    it('should use path in config', async () => {
      app = cluster('apps/app-listen-path', {
        opt: {
          execArgv: [],
          env: {
            ...process.env,
            EGG_APP_LISTEN_PATH_SOCKET: sockFile,
          },
        },
      });
      // app.debug();
      await app.ready();

      app.expect('code', 0);
      app.expect('stdout', new RegExp(`egg started on ${sockFile}`));

      const sock = encodeURIComponent(sockFile);
      await request(`http+unix://${sock}`).get('/').expect('done').expect(200);
    });

    it.skipIf(process.platform !== 'linux')('should use reusePort in config on Linux', async () => {
      app = cluster('apps/app-listen-reusePort', { port: 0, workers: 2 });
      // app.debug();
      await app.ready();

      app.expect('code', 0);
      app.expect('stdout', /egg started on http:\/\/127.0.0.1:17010/);

      await request('http://127.0.0.1:17010').get('/').expect('done').expect(200);
      await request('http://127.0.0.1:17010').get('/port').expect('17010').expect(200);
    });

    it('should set reusePort=true in config (non-Linux will fallback to false)', async () => {
      app = cluster('apps/app-listen-reusePort', { port: 0 });
      // app.debug();
      await app.ready();

      app.expect('code', 0);
      app.expect('stdout', /egg started on http:\/\/127.0.0.1:17010/);

      await request('http://127.0.0.1:17010').get('/').expect('done').expect(200);
      await request('http://127.0.0.1:17010').get('/port').expect('17010').expect(200);
    });
  });
});
