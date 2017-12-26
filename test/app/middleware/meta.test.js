'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const fs = require('mz/fs');
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

  describe('meta.logging = true', () => {
    let app;
    before(() => {
      app = utils.app('apps/meta-logging-app');
      return app.ready();
    });
    after(() => app.close());

    it('should get X-Readtime header', function* () {
      yield app.httpRequest()
        .get('/?foo=bar')
        .expect('X-Readtime', /\d+/)
        .expect('hello world')
        .expect(200);
      const content = (yield fs.readFile(app.coreLogger.options.file, 'utf8')).split('\n').slice(-2, -1)[0];
      assert(content.includes('[meta] request started, host: '));
    });
  });
});
