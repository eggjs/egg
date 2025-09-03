import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import Koa, { type Context } from '../../src/index.ts';

describe('ctx.cookies', () => {
  describe('ctx.cookies.set()', () => {
    it('should set an unsigned cookie', async () => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.cookies.set('name', 'jon');
        ctx.status = 204;
      });

      const server = app.listen();

      const res = await request(server).get('/').expect(204);

      let cookies = res.headers['set-cookie'];
      if (Array.isArray(cookies)) {
        cookies = cookies.join(',');
      }
      const cookie = cookies.startsWith('name=');
      assert.strictEqual(cookie, true);
    });

    describe('with .signed', () => {
      it('should error when no .keys are set', () => {
        const app = new Koa();

        app.use((ctx: Context) => {
          try {
            ctx.cookies.set('foo', 'bar', { signed: true });
          } catch (err) {
            assert.ok(err instanceof Error);
            ctx.body = err.message;
          }
        });

        return request(app.callback())
          .get('/')
          .expect('.keys required for signed cookies');
      });

      it('should send a signed cookie', async () => {
        const app = new Koa();

        app.keys = ['a', 'b'];

        app.use((ctx: Context) => {
          ctx.cookies.set('name', 'jon', { signed: true });
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server).get('/').expect(204);

        let cookies = res.headers['set-cookie'];
        if (Array.isArray(cookies)) {
          cookies = cookies.join(',');
        }
        assert.strictEqual(cookies.startsWith('name='), true);
        assert.strictEqual(/(,|^)name\.sig=/.test(cookies), true);
      });
    });

    describe('with secure', () => {
      it('should get secure from request', async () => {
        const app = new Koa();

        app.proxy = true;
        app.keys = ['a', 'b'];

        app.use(ctx => {
          ctx.cookies.set('name', 'jon', { signed: true });
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server)
          .get('/')
          .set('x-forwarded-proto', 'https') // mock secure
          .expect(204);

        let cookies = res.headers['set-cookie'];
        if (Array.isArray(cookies)) {
          cookies = cookies.join(',');
        }
        assert.strictEqual(cookies.startsWith('name='), true);
        assert.strictEqual(/(,|^)name\.sig=/.test(cookies), true);
        assert.strictEqual(/secure/.test(cookies), true);
      });
    });
  });

  describe('ctx.cookies=', () => {
    it('should override cookie work', async () => {
      const app = new Koa();

      app.use((ctx: Context) => {
        ctx.cookies = {
          set(key: string, value: string) {
            ctx.set(key, value);
            return this;
          },
          // oxlint-disable-next-line typescript/no-explicit-any
        } as any;
        ctx.cookies.set('name', 'jon');
        ctx.status = 204;
      });

      const server = app.listen();

      await request(server).get('/').expect('name', 'jon').expect(204);
    });
  });
});
