import { Application } from '@eggjs/koa';
import request from '@eggjs/supertest';
import { describe, it, expect } from '@voidzero-dev/vite-plus/test';

import { Layer } from '../src/Layer.ts';
import { Router } from '../src/Router.ts';

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
      },
    );
    await request(app.callback()).get('/programming/how-to-node').expect(204);
  });

  describe('Layer#match()', () => {
    it('captures URL path parameters', async () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      router.get('/:category/:title', (ctx) => {
        expect(ctx.params).toBeDefined();
        expect(ctx.params.category).toBe('match');
        expect(ctx.params.title).toBe('this');
        ctx.status = 204;
      });
      await request(app.callback()).get('/match/this').expect(204);
    });

    it('return original path parameters when decodeURIComponent throw error', async () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      router.get('/:category/:title', (ctx) => {
        expect(ctx.params).toBeDefined();
        expect(ctx.params.category).toBe('100%');
        expect(ctx.params.title).toBe('101%');
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
          expect(ctx.captures).toBeDefined();
          expect(Array.isArray(ctx.captures)).toBe(true);
          expect(ctx.captures.length).toBe(1);
          expect(ctx.captures[0]).toBe('1');
          return next();
        },
        (ctx) => {
          expect(ctx.captures).toBeDefined();
          expect(Array.isArray(ctx.captures)).toBe(true);
          expect(ctx.captures.length).toBe(1);
          expect(ctx.captures[0]).toBe('1');
          ctx.status = 204;
        },
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
          expect(Array.isArray(ctx.captures)).toBe(true);
          expect(ctx.captures.length).toBe(1);
          expect(ctx.captures[0]).toBe('101%');
          return next();
        },
        function (ctx) {
          expect(Array.isArray(ctx.captures)).toBe(true);
          expect(ctx.captures.length).toBe(1);
          expect(ctx.captures[0]).toBe('101%');
          ctx.status = 204;
        },
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
          expect(Array.isArray(ctx.captures)).toBe(true);
          expect(ctx.captures.length).toBe(1);
          expect(ctx.captures[0]).toBe(undefined);
          return next();
        },
        function (ctx) {
          expect(Array.isArray(ctx.captures)).toBe(true);
          expect(ctx.captures.length).toBe(1);
          expect(ctx.captures[0]).toBe(undefined);
          ctx.status = 204;
        },
      );
      await request(app.callback()).get('/api').expect(204);
    });

    it('should throw friendly error message when handle not exists', () => {
      const app = new Application();
      const router = new Router();
      app.use(router.routes());
      const notExistsHandle = undefined;

      expect(() => {
        router.get('/foo', notExistsHandle as any);
      }).toThrow(/get `\/foo`: `middleware` must be a function, not `undefined`/);

      expect(() => {
        router.get('foo router', '/foo', notExistsHandle as any);
      }).toThrow(/get `foo router`: `middleware` must be a function, not `undefined`/);

      expect(() => {
        router.post('/foo', function () {}, notExistsHandle as any);
      }).toThrow(/post `\/foo`: `middleware` must be a function, not `undefined`/);
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
        ],
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
      expect(res.body.name).toBe('alex');
    });

    it('ignores params which are not matched', async () => {
      const app = new Application();
      const router = new Router();
      const route = new Layer(
        '/users/:user',
        ['GET'],
        [
          (ctx) => {
            ctx.body = ctx.user;
          },
        ],
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
      expect(res.body.name).toBe('alex');
    });
  });

  describe('Layer#url()', () => {
    it('generates route URL', () => {
      const route = new Layer('/:category/:title', ['get'], [function () {}], 'books');
      const url1 = route.url({ category: 'programming', title: 'how-to-node' });
      expect(url1).toBe('/programming/how-to-node');
      const url2 = route.url('programming', 'how-to-node');
      expect(url2).toBe('/programming/how-to-node');
    });

    it('escapes using encodeURIComponent()', () => {
      const route = new Layer('/:category/:title', ['get'], [() => {}], 'books');
      const url = route.url({ category: 'programming', title: 'how to node' });
      expect(url).toBe('/programming/how%20to%20node');
    });
  });
});
