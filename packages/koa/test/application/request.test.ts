import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import Koa from '../../src/index.ts';

describe('app.request', () => {
  const app1 = new Koa();
  app1.request.message = 'hello';
  const app2 = new Koa();

  it('should merge properties', () => {
    app1.use(ctx => {
      assert.strictEqual(ctx.request.message, 'hello');
      ctx.status = 204;
    });

    return request(app1.listen()).get('/').expect(204);
  });

  it('should not affect the original prototype', () => {
    app2.use(ctx => {
      assert.strictEqual(ctx.request.message, undefined);
      ctx.status = 204;
    });

    return request(app2.listen()).get('/').expect(204);
  });

  it('should access ip work', () => {
    const app = new Koa();
    app.use(ctx => {
      ctx.status = 200;
      ctx.body = ctx.request.ip;
    });

    return request(app.listen())
      .get('/')
      .expect(200)
      .expect('::ffff:127.0.0.1');
  });
});
