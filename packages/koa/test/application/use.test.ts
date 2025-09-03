import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import Koa, { type MiddlewareFunc } from '../../src/index.ts';

describe('app.use(fn)', () => {
  it('should compose middleware', async () => {
    const app = new Koa();
    const calls: number[] = [];

    app.use(async function foo(_ctx, next) {
      calls.push(1);
      await next();
      calls.push(6);
    });

    app.use((_ctx, next) => {
      calls.push(2);
      // oxlint-disable-next-line promise/prefer-await-to-then
      return next().then(() => {
        calls.push(5);
      });
    });

    app.use((_ctx, next) => {
      calls.push(3);
      // oxlint-disable-next-line promise/prefer-await-to-then
      return next().then(() => {
        calls.push(4);
      });
    });

    const server = app.listen();

    await request(server).get('/').expect(404);

    assert.deepStrictEqual(calls, [1, 2, 3, 4, 5, 6]);
  });

  it('should compose mixed middleware', async () => {
    const app = new Koa();
    const calls: number[] = [];

    app.use((_ctx, next) => {
      calls.push(1);
      // oxlint-disable-next-line promise/prefer-await-to-then
      return next().then(() => {
        calls.push(6);
      });
    });

    app.use(async (_ctx, next) => {
      calls.push(2);
      await next();
      calls.push(5);
    });

    app.use((_ctx, next) => {
      calls.push(3);
      // oxlint-disable-next-line promise/prefer-await-to-then
      return next().then(() => {
        calls.push(4);
      });
    });

    const server = app.listen();

    await request(server).get('/').expect(404);

    assert.deepStrictEqual(calls, [1, 2, 3, 4, 5, 6]);
  });

  // https://github.com/koajs/koa/pull/530#issuecomment-148138051
  it('should catch thrown errors in non-async functions', () => {
    const app = new Koa();

    app.use(ctx => ctx.throw('Not Found', 404));

    return request(app.callback()).get('/').expect(404);
  });

  it('should throw error on generator middleware', () => {
    const app = new Koa();

    app.use((_ctx, next) => next());
    assert.throws(
      () => {
        // oxlint-disable-next-line consistent-function-scoping
        app.use(function* generatorMiddleware(_ctx: unknown, next: unknown) {
          console.log('pre generator');
          yield next;
          // this.body = 'generator';
          console.log('post generator');
        } as unknown as MiddlewareFunc);
      },
      // oxlint-disable-next-line prefer-await-to-callbacks
      err => {
        assert.ok(err instanceof TypeError);
        assert.match(err.message, /Support for generators was removed/);
        return true;
      }
    );
  });

  it('should throw error for non-function', () => {
    const app = new Koa();

    for (const v of [null, undefined, 0, false, 'not a function']) {
      assert.throws(
        () => app.use(v as unknown as MiddlewareFunc),
        /middleware must be a function!/
      );
    }
  });

  it('should remove generator functions support', () => {
    const app = new Koa();
    assert.throws(
      () => {
        // oxlint-disable-next-line func-names
        app.use(function* (_ctx: unknown, _next: unknown) {
          // empty
        } as unknown as MiddlewareFunc);
      },
      // oxlint-disable-next-line prefer-await-to-callbacks
      err => {
        assert.ok(err instanceof TypeError);
        assert.match(err.message, /Support for generators was removed/);
        return true;
      }
    );
  });
});
