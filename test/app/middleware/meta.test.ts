import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { createApp, MockApplication, restore, cluster } from '../../utils.js';

describe('test/app/middleware/meta.test.ts', () => {
  afterEach(restore);

  let app: MockApplication;

  describe('default config', () => {
    before(() => {
      app = createApp('apps/middlewares');
      return app.ready();
    });
    after(() => app.close());

    it('should get X-Readtime header', () => {
      return app.httpRequest()
        .get('/')
        .expect('X-Readtime', /\d+/)
        .expect(200);
    });
  });

  describe('config.logger.enablePerformanceTimer = true', () => {
    before(() => {
      app = createApp('apps/middlewares-meta-enablePerformanceTimer');
      return app.ready();
    });
    after(() => app.close());

    it('should get X-Readtime header', async () => {
      for (let i = 0; i < 10; i++) {
        await app.httpRequest()
          .get(`/?i=${i}`)
          .expect('X-Readtime', /^\d+\.\d{1,3}$/)
          .expect(200);
      }
    });
  });

  describe('meta.logging = true', () => {
    before(() => {
      app = createApp('apps/meta-logging-app');
      return app.ready();
    });
    after(() => app.close());

    it('should get X-Readtime header', async () => {
      await app.httpRequest()
        .get('/?foo=bar')
        .expect('X-Readtime', /\d+/)
        .expect('hello world')
        .expect(200);
      if (process.platform === 'win32') {
        await scheduler.wait(2000);
      }
      const content = (await fs.readFile(app.coreLogger.options.file, 'utf8')).split('\n').slice(-2, -1)[0];
      assert.match(content, /\[meta] request started, host: /);
    });
  });

  describe('cluster start', () => {
    let app: MockApplication;
    before(() => {
      app = cluster('apps/middlewares');
      return app.ready();
    });
    after(() => app.close());

    it('should ignore keep-alive header when request is not keep-alive', () => {
      return app.httpRequest()
        .get('/')
        .expect('X-Readtime', /\d+/)
        .expect((res: any) => assert(!res.headers['keep-alive']))
        .expect(200);
    });

    it('should return keep-alive header when request is keep-alive', () => {
      return app.httpRequest()
        .get('/')
        .set('connection', 'keep-alive')
        .expect('X-Readtime', /\d+/)
        .expect('keep-alive', 'timeout=5')
        .expect(200);
    });
  });
});
