const assert = require('assert');
const mm = require('egg-mock');
const fs = require('fs/promises');
const utils = require('../../utils');

describe('test/app/middleware/meta.test.js', () => {
  afterEach(mm.restore);

  describe('default config', () => {
    let app;
    before(() => {
      app = utils.app('apps/middlewares');
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
    let app;
    before(() => {
      app = utils.app('apps/middlewares-meta-enablePerformanceTimer');
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
    let app;
    before(() => {
      app = utils.app('apps/meta-logging-app');
      return app.ready();
    });
    after(() => app.close());

    it('should get X-Readtime header', async () => {
      await app.httpRequest()
        .get('/?foo=bar')
        .expect('X-Readtime', /\d+/)
        .expect('hello world')
        .expect(200);
      const content = (await fs.readFile(app.coreLogger.options.file, 'utf8')).split('\n').slice(-2, -1)[0];
      assert(content.includes('[meta] request started, host: '));
    });
  });

  describe('cluster start', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/middlewares');
      return app.ready();
    });
    after(() => app.close());

    it('should ignore keep-alive header when request is not keep-alive', () => {
      return app.httpRequest()
        .get('/')
        .expect('X-Readtime', /\d+/)
        .expect(res => assert(!res.headers['keep-alive']))
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
