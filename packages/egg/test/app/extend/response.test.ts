import { strict as assert } from 'node:assert';
import { restore, MockApplication, createApp } from '../../utils.js';

describe('test/app/extend/response.test.ts', () => {
  afterEach(restore);

  describe('length and type', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/response');
      return app.ready();
    });
    after(() => app.close());

    it('should get case sensitive header', () => {
      return app.httpRequest()
        .get('/')
        .expect(200)
        .expect((res: any) => {
          assert.match(JSON.stringify(res.res.rawHeaders), /Content-Type/);
          assert.match(JSON.stringify(res.res.rawHeaders), /Content-Length/);
        });
    });

    it('should get {} body', async () => {
      const res = await app.httpRequest()
        .get('/empty-json')
        .expect(200);
      assert.deepEqual(res.body, {});
      assert.equal(res.headers['content-length'], '2');
      assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
    });

    it('should get body length', () => {
      const ctx = app.mockContext();
      ctx.body = null;
      const response = ctx.response;
      response.remove('content-length');
      assert.equal(response.length, undefined);

      ctx.body = '1';
      response.remove('content-length');
      assert.equal(response.length, 1);

      ctx.body = Buffer.alloc(2);
      response.remove('content-length');
      assert.equal(response.length, 2);

      ctx.body = { foo: 'bar' };
      response.remove('content-length');
      assert.equal(response.length, 13);

      ctx.body = '{}';
      response.remove('content-length');
      assert.equal(response.length, 2);

      ctx.body = {};
      response.remove('content-length');
      assert.equal(response.length, 2);

      // mock stream
      // ctx.body = { pipe() {} };
      // response.remove('content-length');
      // assert.equal(response.length, undefined);
    });
  });

  describe('test on apps/demo', () => {
    let app: MockApplication;
    before(() => {
      app = createApp('apps/demo');
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
        let ctx = app.mockContext();
        ctx.response.type = 'html';
        assert.equal(ctx.response.header['content-type'], 'text/html; charset=utf-8');
        assert.equal(ctx.response.type, 'text/html');

        ctx.response.type = 'xml';
        assert.equal(ctx.response.header['content-type'], 'application/xml');
        assert.equal(ctx.response.type, 'application/xml');

        ctx = app.mockContext();
        ctx.response.type = 'html-ooooooxxx';
        assert.equal(ctx.response.header['content-type'], undefined);
        assert.equal(ctx.response.type, '');

        ctx.response.type = 'html';
        assert.equal(ctx.response.header['content-type'], 'text/html; charset=utf-8');
        assert.equal(ctx.response.type, 'text/html');
      });
    });
  });
});
