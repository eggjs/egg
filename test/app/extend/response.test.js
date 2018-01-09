'use strict';

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
      return app.httpRequest()
        .get('/')
        .expect(200)
        .expect(res => {
          assert(res.res.rawHeaders.indexOf('content-type') >= 0);
          assert(res.res.rawHeaders.indexOf('content-length') >= 0);
        });
    });

    it('should get body length', () => {
      const ctx = app.mockContext();
      ctx.body = null;
      ctx.response.remove('content-length');
      assert(ctx.response.length === undefined);
      ctx.body = '1';
      ctx.response.remove('content-length');
      assert(ctx.response.length === 1);
      ctx.body = Buffer.alloc(2);
      ctx.response.remove('content-length');
      assert(ctx.response.length === 2);
      ctx.body = {};
      ctx.response.remove('content-length');
      assert(ctx.response.length === 2);
      // mock stream
      ctx.body = { pipe() {} };
      ctx.response.remove('content-length');
      assert(ctx.response.length === undefined);
    });
  });

  describe('test on apps/demo', () => {
    let app;
    before(() => {
      app = utils.app('apps/demo');
      return app.ready();
    });
    after(() => app.close());

    describe('response.realStatus', () => {
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

    describe('response.type = type', () => {
      it('should remove content-type when type is invalid', () => {
        const ctx = app.mockContext();
        ctx.response.type = 'html';
        assert(ctx.response.header['content-type'] === 'text/html; charset=utf-8');
        assert(ctx.response.type === 'text/html');

        ctx.response.type = 'html-ooooooxxx';
        assert(ctx.response.header['content-type'] === undefined);
        assert(ctx.response.type === '');
      });
    });
  });
});
