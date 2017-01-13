'use strict';

const request = require('supertest');
const assert = require('assert');
const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/app/extend/response.test.js', () => {
  afterEach(mm.restore);

  describe('length and type', () => {
    let app;
    before(() => {
      app = utils.app('apps/response');
      return app.ready();
    });
    after(() => app.close());

    it('should get lower case header', () => {
      return request(app.callback())
      .get('/')
      .expect(200)
      .expect(res => {
        assert(res.res.rawHeaders.indexOf('content-type') >= 0);
        assert(res.res.rawHeaders.indexOf('content-length') >= 0);
      });
    });
  });

  describe('response.realStatus', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    it('should get from status ok', () => {
      const ctx = app.mockContext();
      ctx.response.status = 200;
      assert(ctx.response.realStatus === 200);
      assert(ctx.realStatus === 200);
    });

    it('should get from realStatus ok', () => {
      const ctx = app.mockContext();
      ctx.response.status = 302;
      ctx.response.realStatus = 404;
      assert(ctx.response.realStatus === 404);
      assert(ctx.realStatus === 404);
    });
  });
});
