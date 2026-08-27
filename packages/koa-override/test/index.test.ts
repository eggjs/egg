import { strict as assert } from 'node:assert';

import Koa, { type MiddlewareFunc } from '@eggjs/koa';
import { request } from '@eggjs/supertest';
import bodyParser from 'koa-bodyparser';
import { describe, it } from 'vitest';

import override from '../src/index.ts';

describe('override method middleware', () => {
  it('overrides with x-http-method-override header', async () => {
    const app = new Koa();
    app.use(override());
    app.use((ctx) => {
      ctx.body = { method: ctx.method, url: ctx.url };
    });

    await request(app.callback())
      .post('/foo')
      .set('X-Http-Method-Override', 'DELETE')
      .expect({ method: 'DELETE', url: '/foo' })
      .expect(200);
  });

  it('overrides with body._method', async () => {
    const app = new Koa();
    app.use((bodyParser as unknown as () => MiddlewareFunc)());
    app.use(override());
    app.use((ctx) => {
      ctx.body = { method: ctx.method, url: ctx.url, body: ctx.request.body };
    });

    await request(app.callback())
      .post('/foo')
      .send({ _method: 'delete', value: 'koa' })
      .expect({ method: 'DELETE', url: '/foo', body: { _method: 'delete', value: 'koa' } })
      .expect(200);
  });

  it('ignores a non-string body._method', async () => {
    const app = new Koa();
    app.use((bodyParser as unknown as () => MiddlewareFunc)());
    app.use(override());
    app.use((ctx) => {
      ctx.body = { method: ctx.method, body: ctx.request.body };
    });

    await request(app.callback())
      .post('/foo')
      .send({ _method: 123 })
      .expect({ method: 'POST', body: { _method: 123 } })
      .expect(200);
  });

  it('falls back to the header when body._method is empty', async () => {
    const app = new Koa();
    app.use((bodyParser as unknown as () => MiddlewareFunc)());
    app.use(override());
    app.use((ctx) => {
      ctx.body = { method: ctx.method };
    });

    await request(app.callback())
      .post('/foo')
      .set('X-Http-Method-Override', 'DELETE')
      .send({ _method: '' })
      .expect({ method: 'DELETE' })
      .expect(200);
  });

  it('rejects an invalid override method', async () => {
    const app = new Koa();
    app.on('error', (err) => {
      assert.equal(err.message, 'invalid override method: "SAVE"');
    });
    app.use(override());

    await request(app.callback())
      .post('/foo')
      .set('X-Http-Method-Override', 'SAVE')
      .expect('invalid override method: "SAVE"')
      .expect(400);
  });

  it('does not override a GET request by default', async () => {
    const app = new Koa();
    app.use(override());
    app.use((ctx) => {
      ctx.body = { method: ctx.method };
    });

    await request(app.callback())
      .get('/foo')
      .set('X-Http-Method-Override', 'DELETE')
      .expect({ method: 'GET' })
      .expect(200);
  });

  it('supports custom allowedMethods', async () => {
    const app = new Koa();
    app.use(override({ allowedMethods: ['POST', 'PUT'] }));
    app.use((ctx) => {
      ctx.body = { method: ctx.method };
    });

    await request(app.callback())
      .put('/foo')
      .set('X-Http-Method-Override', 'DELETE')
      .expect({ method: 'DELETE' })
      .expect(200);
  });
});
