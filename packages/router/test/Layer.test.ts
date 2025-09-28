import { strict as assert } from 'node:assert';
import { Application } from '@eggjs/koa';
import request from 'supertest';
import { Router } from '../src/Router.js';
import { Layer } from '../src/Layer.js';

describe('test/Layer.test.ts', () => {
  it('composes multiple callbacks/middleware', async () => {
    const app = new Application();
    const router = new Router();
    app.use(router.routes());
    router.get(
      '/:category/:title',
      (ctx, next) => {
        ctx.status = 500;
        return next();
      },
      (ctx, next) => {
        ctx.status = 204;
        return next();
      }
    );
    await request(app.callback()).get('/programming/how-to-node').expect(204);
  });

  describe('Layer#match()', () => {
    it('captures URL path parameters', async () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      router.get('/:category/:title', ctx => {
        assert(ctx.params);
        assert.equal(ctx.params.category, 'match');
        assert.equal(ctx.params.title, 'this');
        ctx.status = 204;
      });
      await request(app.callback()).get('/match/this').expect(204);
    });

    it('return original path parameters when decodeURIComponent throw error', async () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      router.get('/:category/:title', ctx => {
        assert(ctx.params);
        assert.equal(ctx.params.category, '100%');
        assert.equal(ctx.params.title, '101%');
        ctx.status = 204;
      });
      await request(app.callback()).get('/100%/101%').expect(204);
    });

    it('populates ctx.captures with regexp captures', async () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      router.get(
        /^\/api\/([^/]+)\/?/i,
        (ctx, next) => {
          assert(ctx.captures);
          assert(Array.isArray(ctx.captures));
          assert.equal(ctx.captures.length, 1);
          assert.equal(ctx.captures[0], '1');
          return next();
        },
        ctx => {
          assert(ctx.captures);
          assert(Array.isArray(ctx.captures));
          assert.equal(ctx.captures.length, 1);
          assert.equal(ctx.captures[0], '1');
          ctx.status = 204;
        }
      );
      await request(app.callback()).get('/api/1').expect(204);
    });

    it('return original ctx.captures when decodeURIComponent throw error', async () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      router.get(
        /^\/api\/([^/]+)\/?/i,
        (ctx, next) => {
          assert(Array.isArray(ctx.captures));
          assert.equal(ctx.captures.length, 1);
          assert.equal(ctx.captures[0], '101%');
          return next();
        },
        function (ctx) {
          assert(Array.isArray(ctx.captures));
          assert.equal(ctx.captures.length, 1);
          assert.equal(ctx.captures[0], '101%');
          ctx.status = 204;
        }
      );
      await request(app.callback()).get('/api/101%').expect(204);
    });

    it('populates ctx.captures with regexp captures include undefined', async () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      router.get(
        /^\/api(\/.+)?/i,
        function (ctx, next) {
          assert(Array.isArray(ctx.captures));
          assert.equal(ctx.captures.length, 1);
          assert.equal(ctx.captures[0], undefined);
          return next();
        },
        function (ctx) {
          assert(Array.isArray(ctx.captures));
          assert.equal(ctx.captures.length, 1);
          assert.equal(ctx.captures[0], undefined);
          ctx.status = 204;
        }
      );
      await request(app.callback()).get('/api').expect(204);
    });

    it('should throw friendly error message when handle not exists', () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      const notExistsHandle = undefined;

      assert.throws(
        () => {
          router.get('/foo', notExistsHandle as any);
        },
        (err: TypeError) => {
          assert(err instanceof TypeError);
          assert.equal(err.name, 'TypeError');
          assert.equal(err.message, 'get `/foo`: `middleware` must be a function, not `undefined`');
          return true;
        }
      );

      assert.throws(
        () => {
          router.get('foo router', '/foo', notExistsHandle as any);
        },
        (err: any) => {
          assert.equal(err.message, 'get `foo router`: `middleware` must be a function, not `undefined`');
          return true;
        }
      );

      assert.throws(
        () => {
          router.post('/foo', function () {}, notExistsHandle as any);
        },
        (err: any) => {
          assert.equal(err.message, 'post `/foo`: `middleware` must be a function, not `undefined`');
          return true;
        }
      );
    });
  });

  describe('Layer#param()', () => {
    it('composes middleware for param fn', async () => {
      const app = new Application();
      const router = new Router();
      const route = new Layer(
        '/users/:user',
        ['GET'],
        [
          function (ctx) {
            ctx.body = ctx.user;
          },
        ]
      );
      route.param('user', (id, ctx, next) => {
        ctx.user = { name: 'alex' };
        if (!id) {
          ctx.status = 404;
          return;
        }
        return next();
      });
      router.stack.push(route);
      app.use(router.middleware());
      const res = await request(app.callback()).get('/users/3').expect(200);
      assert.equal(res.body.name, 'alex');
    });

    it('ignores params which are not matched', async () => {
      const app = new Application();
      const router = new Router();
      const route = new Layer(
        '/users/:user',
        ['GET'],
        [
          ctx => {
            ctx.body = ctx.user;
          },
        ]
      );
      route.param('user', function (id, ctx, next) {
        ctx.user = { name: 'alex' };
        if (!id) {
          ctx.status = 404;
          return;
        }
        return next();
      });
      route.param('title', function (id, ctx, next) {
        ctx.user = { name: 'mark' };
        if (!id) {
          ctx.status = 404;
          return;
        }
        return next();
      });
      router.stack.push(route);
      app.use(router.middleware());
      const res = await request(app.callback()).get('/users/3').expect(200);
      assert.equal(res.body.name, 'alex');
    });
  });

  describe('Layer#url()', () => {
    it('generates route URL', () => {
      const route = new Layer('/:category/:title', ['get'], [function () {}], 'books');
      const url1 = route.url({ category: 'programming', title: 'how-to-node' });
      assert.equal(url1, '/programming/how-to-node');
      const url2 = route.url('programming', 'how-to-node');
      assert.equal(url2, '/programming/how-to-node');
    });

    it('escapes using encodeURIComponent()', () => {
      const route = new Layer('/:category/:title', ['get'], [() => {}], 'books');
      const url = route.url({ category: 'programming', title: 'how to node' });
      assert.equal(url, '/programming/how%20to%20node');
    });
  });
});
