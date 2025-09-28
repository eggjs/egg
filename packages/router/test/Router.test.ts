import fs from 'node:fs';

import { Application as Koa } from '@eggjs/koa';
import methods from 'methods';
import request from '@eggjs/supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

import Router from '../src/index.ts';
import type { Next } from '../src/types.ts';

describe('test/lib/router.test.js', () => {
  it('creates new router', () => {
    const router = new Router();
    expect(router instanceof Router).toBe(true);
  });

  it('shares context between routers (gh-205)', async () => {
    const app = new Koa();
    const router1 = new Router();
    const router2 = new Router();
    router1.get('/', function (ctx, next) {
      ctx.foo = 'bar';
      return next();
    });
    router2.get('/', function (ctx, next) {
      ctx.baz = 'qux';
      ctx.body = { foo: ctx.foo };
      return next();
    });
    app.use(router1.routes()).use(router2.routes());
    const res = await request(app.callback()).get('/').expect(200);
    expect(res.body.foo).toBe('bar');
  });

  it('does not register middleware more than once (gh-184)', async () => {
    const app = new Koa();
    const parentRouter = new Router();
    const nestedRouter = new Router();

    nestedRouter
      .get('/first-nested-route', function (ctx) {
        ctx.body = { n: ctx.n };
      })
      .get('/second-nested-route', function (_ctx, next) {
        return next();
      })
      .get('/third-nested-route', function (_ctx, next) {
        return next();
      });

    parentRouter.use(
      '/parent-route',
      function (ctx, next) {
        ctx.n = ctx.n ? ctx.n + 1 : 1;
        return next();
      },
      nestedRouter.routes()
    );

    app.use(parentRouter.routes());

    const res = await request(app.callback()).get('/parent-route/first-nested-route').expect(200);
    expect(res.body.n).toBe(1);
  });

  it('router can be access with ctx', async () => {
    const app = new Koa();
    const router = new Router();
    router.get('home', '/', function (ctx) {
      ctx.body = {
        url: ctx.router.url('home'),
      };
    });
    app.use(router.routes());
    const res = await request(app.callback()).get('/').expect(200);
    expect(res.body.url).toBe('/');
  });

  it('registers multiple middleware for one route', async () => {
    const app = new Koa();
    const router = new Router();

    router.get(
      '/double',
      function (ctx, next) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            ctx.body = { message: 'Hello' };
            resolve(next());
          }, 1);
        });
      },
      function (ctx, next) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            ctx.body.message += ' World';
            resolve(next());
          }, 1);
        });
      },
      function (ctx) {
        ctx.body.message += '!';
      }
    );

    app.use(router.routes());

    const res = await request(app.callback()).get('/double').expect(200);
    expect(res.body.message).toBe('Hello World!');
  });

  it('does not break when nested-routes use regexp paths', () => {
    const app = new Koa();
    const parentRouter = new Router();
    const nestedRouter = new Router();

    nestedRouter
      .get(/^\/\w$/i, function (_ctx, next) {
        return next();
      })
      .get('/first-nested-route', function (_ctx, next) {
        return next();
      })
      .get('/second-nested-route', function (_ctx, next) {
        return next();
      });

    parentRouter.use(
      '/parent-route',
      function (_ctx, next) {
        return next();
      },
      nestedRouter.routes()
    );

    app.use(parentRouter.routes());
    expect(app).toBeDefined();
  });

  it('exposes middleware factory', () => {
    const router = new Router();
    expect(typeof router.routes).toBe('function');
    const middleware = router.routes();
    expect(typeof middleware).toBe('function');
  });

  it('supports promises for async/await', async () => {
    const app = new Koa();
    const router = new Router();
    router.get('/async', function (ctx) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          ctx.body = {
            msg: 'promises!',
          };
          resolve();
        }, 1);
      });
    });

    app.use(router.routes()).use(router.allowedMethods());
    const res = await request(app.callback()).get('/async').expect(200);
    expect(res.body.msg).toBe('promises!');
  });

  it('matches middleware only if route was matched (gh-182)', async () => {
    const app = new Koa();
    const router = new Router();
    const otherRouter = new Router();

    router.use(function (ctx, next) {
      ctx.body = { bar: 'baz' };
      return next();
    });

    otherRouter.get('/bar', function (ctx) {
      ctx.body = ctx.body || { foo: 'bar' };
    });

    app.use(router.routes()).use(otherRouter.routes());

    const res = await request(app.callback()).get('/bar').expect(200);
    expect(res.body.foo).toBe('bar');
    expect(res.body.bar).toBeUndefined();
  });

  it('matches first to last', async () => {
    const app = new Koa();
    const router = new Router();

    router
      .get('user_page', '/user/(.*).jsx', function (ctx) {
        ctx.body = { order: 1 };
      })
      .all('app', '/app/(.*).jsx', function (ctx) {
        ctx.body = { order: 2 };
      })
      .all('view', '(.*).jsx', function (ctx) {
        ctx.body = { order: 3 };
      });

    const res = await request(app.use(router.routes()).callback()).get('/user/account.jsx').expect(200);
    expect(res.body.order).toBe(1);
  });

  it('does not run subsequent middleware without calling next', async () => {
    const app = new Koa();
    const router = new Router();

    router.get(
      'user_page',
      '/user/(.*).jsx',
      function () {
        // no next()
      },
      function (ctx) {
        ctx.body = { order: 1 };
      }
    );

    await request(app.use(router.routes()).callback()).get('/user/account.jsx').expect(404);
  });

  it('nests routers with prefixes at root', async () => {
    const app = new Koa();
    const forums = new Router({
      prefix: '/forums',
    });
    const posts = new Router({
      prefix: '/:fid/posts',
    });

    posts
      .get('/', function (ctx, next) {
        ctx.status = 204;
        return next();
      })
      .get('/:pid', function (ctx, next) {
        ctx.body = ctx.params;
        return next();
      });

    forums.use(posts.routes());

    const server = app.use(forums.routes()).callback();

    await request(server).get('/forums/1/posts').expect(204);
    await request(server).get('/forums/1').expect(404);
    const res = await request(server).get('/forums/1/posts/2').expect(200);
    expect(res.body.fid).toBe('1');
    expect(res.body.pid).toBe('2');
  });

  it('nests routers with prefixes at path', async () => {
    const app = new Koa();
    const forums = new Router({
      prefix: '/api',
    });
    const posts = new Router({
      prefix: '/posts',
    });

    posts
      .get('/', function (ctx, next) {
        ctx.status = 204;
        return next();
      })
      .get('/:pid', function (ctx, next) {
        ctx.body = ctx.params;
        return next();
      });

    forums.use('/forums/:fid', posts.routes());

    const server = app.use(forums.routes()).callback();

    await request(server).get('/api/forums/1/posts').expect(204);

    await request(server).get('/api/forums/1').expect(404);

    const res = await request(server).get('/api/forums/1/posts/2').expect(200);
    expect(res.body.fid).toBe('1');
    expect(res.body.pid).toBe('2');
  });

  it('runs subrouter middleware after parent', async () => {
    const app = new Koa();
    const subrouter = new Router()
      .use(function (ctx, next) {
        ctx.msg = 'subrouter';
        return next();
      })
      .get('/', function (ctx) {
        ctx.body = { msg: ctx.msg };
      });
    const router = new Router()
      .use(function (ctx, next) {
        ctx.msg = 'router';
        return next();
      })
      .use(subrouter.routes());
    const res = await request(app.use(router.routes()).callback()).get('/').expect(200);
    expect(res.body.msg).toBe('subrouter');
  });

  it('runs parent middleware for subrouter routes', async () => {
    const app = new Koa();
    const subrouter = new Router().get('/sub', function (ctx) {
      ctx.body = { msg: ctx.msg };
    });
    const router = new Router()
      .use(function (ctx, next) {
        ctx.msg = 'router';
        return next();
      })
      .use('/parent', subrouter.routes());
    const res = await request(app.use(router.routes()).callback()).get('/parent/sub').expect(200);
    expect(res.body.msg).toBe('router');
  });

  it('matches corresponding requests', async () => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router.get('/:category/:title', function (ctx) {
      expect(ctx.params.category).toBe('programming');
      expect(ctx.params.title).toBe('how-to-node');
      ctx.status = 204;
    });
    router.post('/:category', function (ctx) {
      expect(ctx.params.category).toBe('programming');
      ctx.status = 204;
    });
    router.put('/:category/not-a-title', function (ctx) {
      expect(ctx.params.category).toBe('programming');
      expect(ctx.params.title).toBeUndefined();
      ctx.status = 204;
    });
    const server = app.callback();
    await request(server).get('/programming/how-to-node').expect(204);
    await request(server).post('/programming').expect(204);
    await request(server).put('/programming/not-a-title').expect(204);
  });

  it('executes route middleware using `app.context`', async () => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router.use(function (ctx, next) {
      ctx.bar = 'baz';
      return next();
    });
    router.get(
      '/:category/:title',
      function (ctx, next) {
        ctx.foo = 'bar';
        return next();
      },
      function (ctx) {
        ctx.body = {
          bar: ctx.bar,
          foo: ctx.foo,
        };
      }
    );
    const res = await request(app.callback()).get('/match/this').expect(200);
    expect(res.body.bar).toBe('baz');
    expect(res.body.foo).toBe('bar');
  });

  it('does not match after ctx.throw()', async () => {
    const app = new Koa();
    let counter = 0;
    const router = new Router();
    app.use(router.routes());
    router.get('/', function (ctx) {
      counter++;
      ctx.throw(403);
    });
    router.get('/', function () {
      counter++;
    });
    await request(app.callback()).get('/').expect(403);
    expect(counter).toBe(1);
  });

  it('supports promises for route middleware', async () => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    const readVersion = function () {
      return new Promise(function (resolve, reject) {
        fs.readFile('package.json', 'utf8', function (err, data) {
          if (err) return reject(err);
          resolve(JSON.parse(data).version);
        });
      });
    };
    router.get(
      '/',
      function (_ctx, next) {
        return next();
      },
      function (ctx) {
        return readVersion().then(function () {
          ctx.status = 204;
        });
      }
    );
    await request(app.callback()).get('/').expect(204);
  });

  describe('Router#allowedMethods()', () => {
    it('responds to OPTIONS requests', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      app.use(router.allowedMethods());
      router.get('/users', function () {});
      router.put('/users', function () {});
      const res = await request(app.callback()).options('/users').expect(200);
      expect(res.headers['content-length']).toBe('0');
      expect(res.headers.allow).toBe('HEAD, GET, PUT');
    });

    it('responds with 405 Method Not Allowed', async () => {
      const app = new Koa();
      const router = new Router();
      router.get('/users', function () {});
      router.put('/users', function () {});
      router.post('/events', function () {});
      app.use(router.routes());
      app.use(router.allowedMethods());
      const res = await request(app.callback()).post('/users').expect(405);
      expect(res.headers.allow).toBe('HEAD, GET, PUT');
    });

    it('responds ignore allowedMethods when status is already set', async () => {
      const app = new Koa();
      const router = new Router();
      router.get('/users', function () {});
      router.put('/users', function () {});
      router.post('/events', function () {});
      app.use((ctx, next) => {
        ctx.status = 200;
        next();
      });
      app.use(router.routes());
      app.use(router.allowedMethods());
      const res = await request(app.callback()).post('/users').expect(200);
      expect(res.headers.allow).toBeUndefined();
    });

    it('responds with 405 Method Not Allowed using the "throw" option', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      app.use(function (ctx, next) {
        return next().catch(function (err) {
          // assert that the correct HTTPError was thrown
          // err.name.should.equal('MethodNotAllowedError');
          // err.statusCode.should.equal(405);

          // translate the HTTPError to a normal response
          ctx.body = err.name;
          ctx.status = err.statusCode;
        });
      });
      app.use(router.allowedMethods({ throw: true }));
      router.get('/users', function () {});
      router.put('/users', function () {});
      router.post('/events', function () {});
      const res = await request(app.callback()).post('/users').expect(405);
      // the 'Allow' header is not set when throwing
      expect(res.headers.allow).toBeUndefined();
    });

    it('responds with user-provided throwable using the "throw" and "methodNotAllowed" options', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      app.use(function (ctx, next) {
        return next().catch(function (err) {
          // assert that the correct HTTPError was thrown
          // err.message.should.equal('Custom Not Allowed Error');
          // err.statusCode.should.equal(405);

          // translate the HTTPError to a normal response
          ctx.body = err.body;
          ctx.status = err.statusCode;
        });
      });
      app.use(
        router.allowedMethods({
          throw: true,
          methodNotAllowed() {
            const notAllowedErr: any = new Error('Custom Not Allowed Error');
            notAllowedErr.type = 'custom';
            notAllowedErr.statusCode = 405;
            notAllowedErr.body = {
              error: 'Custom Not Allowed Error',
              statusCode: 405,
              otherStuff: true,
            };
            return notAllowedErr;
          },
        })
      );
      router.get('/users', function () {});
      router.put('/users', function () {});
      router.post('/events', function () {});
      const res = await request(app.callback()).post('/users').expect(405);
      // the 'Allow' header is not set when throwing
      expect(res.headers.allow).toBeUndefined();
      expect(res.body).toEqual({
        error: 'Custom Not Allowed Error',
        statusCode: 405,
        otherStuff: true,
      });
    });

    it('responds with 501 Not Implemented', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      app.use(router.allowedMethods());
      router.get('/users', function () {});
      router.put('/users', function () {});
      // await request(app.callback()).search('/users').expect(501);
      // @ts-expect-error protected method
      await request(app.callback())._testRequest('search', '/users').expect(501);
    });

    it('responds with 501 Not Implemented using the "throw" option', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      app.use(function (ctx, next) {
        return next().catch(function (err) {
          // assert that the correct HTTPError was thrown
          // err.name.should.equal('NotImplementedError');
          // err.statusCode.should.equal(501);

          // translate the HTTPError to a normal response
          ctx.body = err.name;
          ctx.status = err.statusCode;
        });
      });
      app.use(router.allowedMethods({ throw: true }));
      router.get('/users', function () {});
      router.put('/users', function () {});
      // @ts-expect-error protected method
      const res = await request(app.callback())._testRequest('search', '/users').expect(501);
      // the 'Allow' header is not set when throwing
      expect(res.headers.allow).toBeUndefined();
    });

    it('responds with user-provided throwable using the "throw" and "notImplemented" options', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      app.use(function (ctx, next) {
        return next().catch(function (err) {
          // assert that our custom error was thrown
          // err.message.should.equal('Custom Not Implemented Error');
          // err.type.should.equal('custom');
          // err.statusCode.should.equal(501);

          // translate the HTTPError to a normal response
          ctx.body = err.body;
          ctx.status = err.statusCode;
        });
      });
      app.use(
        router.allowedMethods({
          throw: true,
          notImplemented() {
            const notImplementedErr: any = new Error('Custom Not Implemented Error');
            notImplementedErr.type = 'custom';
            notImplementedErr.statusCode = 501;
            notImplementedErr.body = {
              error: 'Custom Not Implemented Error',
              statusCode: 501,
              otherStuff: true,
            };
            return notImplementedErr;
          },
        })
      );
      router.get('/users', function () {});
      router.put('/users', function () {});
      // @ts-expect-error protected method
      const res = await request(app.callback())._testRequest('search', '/users').expect(501);
      // the 'Allow' header is not set when throwing
      expect(res.header.allow).toBeUndefined();
      expect(res.body).toEqual({
        error: 'Custom Not Implemented Error',
        statusCode: 501,
        otherStuff: true,
      });
    });

    it('does not send 405 if route matched but status is 404', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      app.use(router.allowedMethods());
      router.get('/users', function (ctx) {
        ctx.status = 404;
      });
      await request(app.callback()).get('/users').expect(404);
    });

    it('sets the allowed methods to a single Allow header #273', async () => {
      // https://tools.ietf.org/html/rfc7231#section-7.4.1
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      app.use(router.allowedMethods());

      router.get('/', function () {});

      const res = await request(app.callback()).options('/').expect(200);
      expect(res.header.allow).toBe('HEAD, GET');
    });
  });

  it('supports custom routing detect path: ctx.routerPath', async () => {
    const app = new Koa();
    const router = new Router();
    app.use(function (ctx, next) {
      // bind helloworld.example.com/users => example.com/helloworld/users
      const appname = ctx.request.hostname.split('.', 1)[0];
      ctx.routerPath = '/' + appname + ctx.path;
      return next();
    });
    app.use(router.routes());
    router.get('/helloworld/users', function (ctx) {
      ctx.body = ctx.method + ' ' + ctx.url;
    });

    await request(app.callback()).get('/users').set('Host', 'helloworld.example.com').expect(200).expect('GET /users');
  });

  describe('Router#[verb]()', () => {
    it('registers route specific to HTTP verb', () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      methods.forEach(function (method) {
        expect(method in router).toBe(true);
        expect(typeof Reflect.get(router, method) === 'function').toBe(true);
        Reflect.get(router, method).call(router, '/', function () {});
      });
      expect(router.stack.length).toBe(methods.length);
    });

    it('registers route with a regexp path', () => {
      const router = new Router();
      methods.forEach(function (method) {
        expect(Reflect.get(router, method).call(router, /^\/\w$/i, function () {})).toBe(router);
      });
    });

    it('registers route with a given name', () => {
      const router = new Router();
      methods.forEach(function (method) {
        expect(Reflect.get(router, method).call(router, '/', function () {})).toBe(router);
      });
    });

    it('registers route with with a given name and regexp path', () => {
      const router = new Router();
      methods.forEach(function (method) {
        expect(Reflect.get(router, method).call(router, /^\/$/i, function () {})).toBe(router);
      });
    });

    it('enables route chaining', () => {
      const router = new Router();
      methods.forEach(function (method) {
        expect(Reflect.get(router, method.toLowerCase())).toBeDefined();
        expect(Reflect.get(router, method.toLowerCase()).call(router, '/', function () {})).toBe(router);
      });
    });

    it('registers array of paths (gh-203)', () => {
      const router = new Router();
      router.get(['/one', '/two'], function (_ctx, next) {
        return next();
      });
      expect(router.stack.length).toBe(2);
      expect(router.stack[0].path).toBe('/one');
      expect(router.stack[1].path).toBe('/two');
    });

    it('resolves non-parameterized routes without attached parameters', async () => {
      const app = new Koa();
      const router = new Router();

      router.get('/notparameter', function (ctx) {
        ctx.body = {
          param: ctx.params.parameter,
          routerName: ctx.routerName,
          routerPath: ctx.routerPath,
        };
      });

      router.get('/:parameter', function (ctx) {
        ctx.body = {
          param: ctx.params.parameter,
          routerName: ctx.routerName,
          routerPath: ctx.routerPath,
        };
      });

      app.use(router.routes());
      const res = await request(app.callback()).get('/notparameter').expect(200);
      expect(res.body.param).toBeUndefined();
      expect(res.body.routerName).toBeUndefined();
      expect(res.body.routerPath).toBe('/notparameter');
    });
  });

  describe('Router#use()', () => {
    it('uses router middleware without path', async () => {
      const app = new Koa();
      const router = new Router();

      router.use(function (ctx, next) {
        ctx.foo = 'baz';
        return next();
      });

      router.use(function (ctx, next) {
        ctx.foo = 'foo';
        return next();
      });

      router.get('/foo/bar', function (ctx) {
        ctx.body = {
          foobar: ctx.foo + 'bar',
        };
      });

      app.use(router.routes());
      const res = await request(app.callback()).get('/foo/bar').expect(200);
      expect(res.body.foobar).toBe('foobar');
    });

    it('uses router middleware at given path', async () => {
      const app = new Koa();
      const router = new Router();

      router.use('/foo/bar', function (ctx, next) {
        ctx.foo = 'foo';
        return next();
      });

      router.get('/foo/bar', function (ctx) {
        ctx.body = {
          foobar: ctx.foo + 'bar',
        };
      });

      app.use(router.routes());
      const res = await request(app.callback()).get('/foo/bar').expect(200);
      expect(res.body.foobar).toBe('foobar');
    });

    it('runs router middleware before subrouter middleware', async () => {
      const app = new Koa();
      const router = new Router();
      const subrouter = new Router();

      router.use(function (ctx, next) {
        ctx.foo = 'boo';
        return next();
      });

      subrouter
        .use(function (ctx, next) {
          ctx.foo = 'foo';
          return next();
        })
        .get('/bar', function (ctx) {
          ctx.body = {
            foobar: ctx.foo + 'bar',
          };
        });

      router.use('/foo', subrouter.routes());
      app.use(router.routes());
      const res = await request(app.callback()).get('/foo/bar').expect(200);
      expect(res.body.foobar).toBe('foobar');
    });

    it('assigns middleware to array of paths', async () => {
      const app = new Koa();
      const router = new Router();

      router.use(['/foo', '/bar'], function (ctx, next) {
        ctx.foo = 'foo';
        ctx.bar = 'bar';
        return next();
      });

      router.get('/foo', function (ctx) {
        ctx.body = {
          foobar: ctx.foo + 'bar',
        };
      });

      router.get('/bar', function (ctx) {
        ctx.body = {
          foobar: 'foo' + ctx.bar,
        };
      });

      app.use(router.routes());
      let res = await request(app.callback()).get('/foo').expect(200);
      expect(res.body.foobar).toBe('foobar');
      res = await request(app.callback()).get('/bar').expect(200);
      expect(res.body.foobar).toBe('foobar');
    });

    it('without path, does not set params.0 to the matched path - gh-247', async () => {
      const app = new Koa();
      const router = new Router();

      router.use(function (_ctx, next) {
        return next();
      });

      router.get('/foo/:id', function (ctx) {
        ctx.body = ctx.params;
      });

      app.use(router.routes());
      const res = await request(app.callback()).get('/foo/815').expect(200);
      expect(res.body.id).toBe('815');
      expect(res.body['0']).toBeUndefined();

      const res2 = await request(app.callback()).get('/foo/1,2,3,4,5').expect(200);
      expect(res2.body.id).toBe('1,2,3,4,5');
    });

    it('does not add an erroneous (.*) to unprefixed nested routers - gh-369 gh-410', async () => {
      const app = new Koa();
      const router = new Router();
      const nested = new Router();
      let called = 0;

      nested
        .get('/', (ctx, next) => {
          ctx.body = 'root';
          called += 1;
          return next();
        })
        .get('/test', (ctx, next) => {
          ctx.body = 'test';
          called += 1;
          return next();
        });

      router.use(nested.routes());
      app.use(router.routes());

      await request(app.callback()).get('/test').expect(200).expect('test');
      expect(called).toBe(1);
    });
  });

  describe('Router#register()', () => {
    it('registers new routes', () => {
      const app = new Koa();
      const router = new Router();
      expect(typeof router.register === 'function').toBe(true);
      const route = router.register('/', ['GET', 'POST'], function () {});
      expect(route).toBeDefined();
      app.use(router.routes());
      expect(router.stack.length).toBe(1);
      expect(router.stack[0].path).toBe('/');
    });
  });

  describe('Router#redirect()', () => {
    it('registers redirect routes', () => {
      const app = new Koa();
      const router = new Router();
      expect(typeof router.redirect === 'function').toBe(true);
      router.redirect('/source', '/destination', 302);
      app.use(router.routes());
      expect(router.stack.length).toBe(1);
      expect(router.stack[0].path).toBe('/source');
    });

    it('redirects using route names', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      router.get('home', '/', function () {});
      router.get('sign-up-form', '/sign-up-form', function () {});
      router.redirect('home', 'sign-up-form');
      const res = await request(app.callback()).post('/').expect(301);
      expect(res.headers.location).toBe('/sign-up-form');
    });

    it('registers redirect not exists routes', () => {
      const router = new Router();
      expect(typeof router.redirect === 'function').toBe(true);
      expect(() => {
        router.redirect('source-not-exists', '/destination', 302);
      }).toThrow(/No route found for name: source-not-exists/);
      expect(() => {
        router.redirect('/source', 'destination-not-exists');
      }).toThrow(/No route found for name: destination-not-exists/);
    });
  });

  describe('Router#route()', () => {
    it('inherits routes from nested router', () => {
      const subrouter = new Router().get('child', '/hello', function (ctx) {
        ctx.body = { hello: 'world' };
      });
      const router = new Router().use(subrouter.routes());
      const route = router.route('child');
      expect(route).toBeDefined();
      expect(route && route.name).toBe('child');
    });
  });

  describe('Router#url()', () => {
    it('generates URL for given route name', () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      router.get('books', '/:category/:title', function (ctx) {
        ctx.status = 204;
      });
      let url = router.url('books', { category: 'programming', title: 'how to node' });
      expect(url).toBe('/programming/how%20to%20node');
      url = router.url('books', 'programming', 'how to node');
      expect(url).toBe('/programming/how%20to%20node');

      const err = router.url('not-exists', { category: 'programming', title: 'how to node' }) as Error;
      expect(err.message).toBe('No route found for name: not-exists');
    });

    it('generates URL for given route name within embedded routers', () => {
      const app = new Koa();
      const router = new Router({
        prefix: '/books',
      });

      const embeddedRouter = new Router({
        prefix: '/chapters',
      });
      embeddedRouter.get('chapters', '/:chapterName/:pageNumber', function (ctx) {
        ctx.status = 204;
      });
      router.use(embeddedRouter.routes());
      app.use(router.routes());
      let url = router.url('chapters', { chapterName: 'Learning ECMA6', pageNumber: 123 });
      expect(url).toBe('/books/chapters/Learning%20ECMA6/123');
      url = router.url('chapters', 'Learning ECMA6', 123);
      expect(url).toBe('/books/chapters/Learning%20ECMA6/123');
    });

    it('generates URL for given route name within two embedded routers', () => {
      const app = new Koa();
      const router = new Router({
        prefix: '/books',
      });
      const embeddedRouter = new Router({
        prefix: '/chapters',
      });
      const embeddedRouter2 = new Router({
        prefix: '/:chapterName/pages',
      });
      embeddedRouter2.get('chapters', '/:pageNumber', function (ctx) {
        ctx.status = 204;
      });
      embeddedRouter.use(embeddedRouter2.routes());
      router.use(embeddedRouter.routes());
      app.use(router.routes());
      const url = router.url('chapters', { chapterName: 'Learning ECMA6', pageNumber: 123 });
      expect(url).toBe('/books/chapters/Learning%20ECMA6/pages/123');
    });

    it('generates URL for given route name with params and query params', () => {
      const router = new Router();
      router.get('books', '/books/:category/:id', function (ctx) {
        ctx.status = 204;
      });
      let url = router.url('books', 'programming', 4, {
        query: { page: 3, limit: 10 },
      });
      expect(url).toBe('/books/programming/4?page=3&limit=10');
      url = router.url('books', { category: 'programming', id: 4 }, { query: { page: 3, limit: 10 } });
      expect(url).toBe('/books/programming/4?page=3&limit=10');
      url = router.url('books', { category: 'programming', id: 4 }, { query: 'page=3&limit=10' });
      expect(url).toBe('/books/programming/4?page=3&limit=10');
    });

    it('generates URL for given route name without params and query params', () => {
      const router = new Router();
      router.get('category', '/category', function (ctx) {
        ctx.status = 204;
      });
      const url = router.url('category', {
        query: { page: 3, limit: 10 },
      });
      expect(url).toBe('/category?page=3&limit=10');
    });
  });

  describe('Router#param()', () => {
    it('runs parameter middleware', async () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      router
        .param('user', function (id, ctx, next) {
          ctx.user = { name: 'alex' };
          if (!id) {
            ctx.status = 404;
            return;
          }
          return next();
        })
        .get('/users/:user', function (ctx) {
          ctx.body = ctx.user;
        });
      const res = await request(app.callback()).get('/users/3').expect(200);
      expect(res.body.name).toBe('alex');
    });

    it('runs parameter middleware in order of URL appearance', async () => {
      const app = new Koa();
      const router = new Router();
      router
        .param('user', function (id, ctx, next) {
          ctx.user = { name: 'alex' };
          if (ctx.ranFirst) {
            ctx.user.ordered = 'parameters';
          }
          if (!id) {
            ctx.status = 404;
            return;
          }
          return next();
        })
        .param('first', function (id, ctx, next) {
          ctx.ranFirst = true;
          if (ctx.user) {
            ctx.ranFirst = false;
          }
          if (!id) {
            ctx.status = 404;
            return;
          }
          return next();
        })
        .get('/:first/users/:user', function (ctx) {
          ctx.body = ctx.user;
        });

      const res = await request(app.use(router.routes()).callback()).get('/first/users/3').expect(200);
      expect(res.body.name).toBe('alex');
      expect(res.body.ordered).toBe('parameters');
    });

    it('runs parameter middleware in order of URL appearance even when added in random order', async () => {
      const app = new Koa();
      const router = new Router();
      router
        // intentional random order
        .param('a', function (id, ctx, next) {
          ctx.state.loaded = [id];
          return next();
        })
        .param('d', function (id, ctx, next) {
          ctx.state.loaded.push(id);
          return next();
        })
        .param('c', function (id, ctx, next) {
          ctx.state.loaded.push(id);
          return next();
        })
        .param('b', function (id, ctx, next) {
          ctx.state.loaded.push(id);
          return next();
        })
        .get('/:a/:b/:c/:d', function (ctx) {
          ctx.body = ctx.state.loaded;
        });

      const res = await request(app.use(router.routes()).callback()).get('/1/2/3/4').expect(200);
      expect(res.body).toEqual(['1', '2', '3', '4']);
    });

    it('runs parent parameter middleware for subrouter', async () => {
      const app = new Koa();
      const router = new Router();
      const subrouter = new Router();
      subrouter.get('/:cid', function (ctx) {
        ctx.body = {
          id: ctx.params.id,
          cid: ctx.params.cid,
        };
      });
      router
        .param('id', function (id, ctx, next) {
          ctx.params.id = 'ran';
          if (!id) {
            ctx.status = 404;
            return;
          }
          return next();
        })
        .use('/:id/children', subrouter.routes());

      const res = await request(app.use(router.routes()).callback()).get('/did-not-run/children/2').expect(200);
      expect(res.body.id).toBe('ran');
      expect(res.body.cid).toBe('2');
    });
  });

  describe('Router#opts', () => {
    it('responds with 200', async () => {
      const app = new Koa();
      const router = new Router({
        strict: true,
      });
      router.get('/info', function (ctx) {
        ctx.body = 'hello';
      });
      const res = await request(app.use(router.routes()).callback()).get('/info').expect(200);
      expect(res.text).toBe('hello');
    });

    it('should allow setting a prefix', async () => {
      const app = new Koa();
      const routes = new Router({ prefix: '/things/:thing_id' });

      routes.get('/list', function (ctx) {
        ctx.body = ctx.params;
      });

      const res = await request(app.use(routes.routes()).callback()).get('/things/1/list').expect(200);
      expect(res.body.thing_id).toBe('1');
    });

    it('responds with 404 when has a trailing slash', async () => {
      const app = new Koa();
      const router = new Router({
        strict: true,
      });
      router.get('/info', function (ctx) {
        ctx.body = 'hello';
      });
      await request(app.use(router.routes()).callback()).get('/info/').expect(404);
    });
  });

  describe('use middleware with opts', () => {
    it('responds with 200', async () => {
      const app = new Koa();
      const router = new Router({
        strict: true,
      });
      router.get('/info', function (ctx) {
        ctx.body = 'hello';
      });
      const res = await request(app.use(router.routes()).callback()).get('/info').expect(200);
      expect(res.text).toBe('hello');
    });

    it('responds with 404 when has a trailing slash', async () => {
      const app = new Koa();
      const router = new Router({
        strict: true,
      });
      router.get('/info', function (ctx) {
        ctx.body = 'hello';
      });
      await request(app.use(router.routes()).callback()).get('/info/').expect(404);
    });
  });

  describe('router.routes()', () => {
    it('should return composed middleware', async () => {
      const app = new Koa();
      const router = new Router();
      let middlewareCount = 0;
      const middlewareA = function (_ctx: any, next: Next) {
        middlewareCount++;
        return next();
      };
      const middlewareB = function (_ctx: any, next: Next) {
        middlewareCount++;
        return next();
      };

      router.use(middlewareA, middlewareB);
      router.get('/users/:id', function (ctx) {
        expect(ctx.params.id).toBeDefined();
        ctx.body = { hello: 'world' };
      });

      const routerMiddleware = router.routes();
      expect(typeof routerMiddleware === 'function').toBe(true);

      const res = await request(app.use(routerMiddleware).callback()).get('/users/1').expect(200);
      expect(res.body.hello).toBe('world');
      expect(middlewareCount).toBe(2);
    });

    it('places a `_matchedRoute` value on context', async () => {
      const app = new Koa();
      const router = new Router();
      const middleware = function (ctx: any, next: Next) {
        expect(ctx._matchedRoute).toBe('/users/:id');
        return next();
      };

      router.get('/users/:id', middleware, function (ctx) {
        expect(ctx._matchedRoute).toBe('/users/:id');
        expect(ctx.params.id).toBeDefined();
        ctx.body = { hello: 'world' };
      });

      const routerMiddleware = router.routes();

      await request(app.use(routerMiddleware).callback()).get('/users/1').expect(200);
    });

    it('places a `_matchedRouteName` value on the context for a named route', async () => {
      const app = new Koa();
      const router = new Router();

      router.get('users#show', '/users/:id', function (ctx) {
        expect(ctx._matchedRouteName).toBe('users#show');
        ctx.status = 200;
      });

      await request(app.use(router.routes()).callback()).get('/users/1').expect(200);
    });

    it('does not place a `_matchedRouteName` value on the context for unnamed routes', async () => {
      const app = new Koa();
      const router = new Router();

      router.get('/users/:id', function (ctx) {
        expect(ctx._matchedRouteName).toBeUndefined();
        ctx.status = 200;
      });

      await request(app.use(router.routes()).callback()).get('/users/1').expect(200);
    });

    it('routerName and routerPath work with next', async () => {
      const app = new Koa();
      const router = new Router();
      router.get('name1', '/users/1', function (ctx, next) {
        expect(ctx._matchedRouteName).toBe('name1');
        expect(ctx.routerName).toBe('name1');
        expect(ctx._matchedRoute).toBe('/users/1');
        expect(ctx.routerPath).toBe('/users/1');
        return next();
      });
      router.get('name2', '/users/:id', function (ctx) {
        expect(ctx._matchedRouteName).toBe('name2');
        expect(ctx.routerName).toBe('name2');
        expect(ctx._matchedRoute).toBe('/users/:id');
        expect(ctx.routerPath).toBe('/users/:id');
        ctx.status = 200;
      });

      await request(app.use(router.routes()).callback()).get('/users/1').expect(200);
    });
  });

  describe('If no HEAD method, default to GET', () => {
    it('should default to GET', async () => {
      const app = new Koa();
      const router = new Router();
      console.log(router);
      router.get('/users/:id', function (ctx) {
        expect(ctx.params.id).toBeDefined();
        ctx.body = 'hello';
      });
      app.use(router.routes());
      let res = await request(app.callback()).get('/users/1').expect(200);
      expect(res.text).toBe('hello');
      res = await request(app.callback()).head('/users/1').expect(200);
      expect(res.text).toBeUndefined();
    });
  });

  describe('Router#prefix', () => {
    it('should set opts.prefix', () => {
      const router = new Router();
      expect(router.opts.prefix).toBeUndefined();
      router.prefix('/things/:thing_id');
      expect(router.opts.prefix).toBe('/things/:thing_id');
    });

    it('should prefix existing routes', () => {
      const router = new Router();
      router.get('/users/:id', function (ctx) {
        ctx.body = 'test';
      });
      router.prefix('/things/:thing_id');
      const route = router.stack[0];
      expect(route.path).toBe('/things/:thing_id/users/:id');
      expect(route.paramNames.length).toBe(2);
      expect(route.paramNames[0].name).toBe('thing_id');
      expect(route.paramNames[1].name).toBe('id');
    });

    describe('when used with .use(fn) - gh-247', () => {
      it('does not set params.0 to the matched path', async () => {
        const app = new Koa();
        const router = new Router();

        router.use(function (_ctx, next) {
          return next();
        });

        router.get('/foo/:id', function (ctx) {
          ctx.body = ctx.params;
        });

        router.prefix('/things');

        app.use(router.routes());
        const res = await request(app.callback()).get('/things/foo/108').expect(200);
        expect(res.body.id).toBe('108');
        expect(res.body['0']).toBeUndefined();
      });
    });

    describe('with trailing slash', testPrefix('/admin/'));
    describe('without trailing slash', testPrefix('/admin'));

    function testPrefix(prefix: string) {
      return () => {
        let server: any;
        let middlewareCount = 0;

        beforeAll(function () {
          const app = new Koa();
          const router = new Router();

          router.use(function (ctx, next) {
            middlewareCount++;
            ctx.thing = 'worked';
            return next();
          });

          router.get('/', function (ctx) {
            middlewareCount++;
            ctx.body = { name: ctx.thing };
          });

          router.prefix(prefix);
          server = app.use(router.routes()).callback();
        });

        beforeEach(() => {
          middlewareCount = 0;
        });

        it('should support root level router middleware', async () => {
          const res = await request(server).get(prefix).expect(200);
          expect(middlewareCount).toBe(2);
          expect(res.body.name).toBe('worked');
        });

        it('should support requests with a trailing path slash', async () => {
          const res = await request(server).get('/admin/').expect(200);
          expect(middlewareCount).toBe(2);
          expect(res.body.name).toBe('worked');
        });

        it('should support requests without a trailing path slash', async () => {
          const res = await request(server).get('/admin').expect(200);
          expect(middlewareCount).toBe(2);
          expect(res.body.name).toBe('worked');
        });
      };
    }
  });

  describe('Static Router#url()', () => {
    it('generates route URL', () => {
      const url = Router.url('/:category/:title', { category: 'programming', title: 'how-to-node' });
      expect(url).toBe('/programming/how-to-node');
    });

    it('escapes using encodeURIComponent()', () => {
      const url = Router.url('/:category/:title', { category: 'programming', title: 'how to node' });
      expect(url).toBe('/programming/how%20to%20node');
    });

    it('generates route URL with params and query params', () => {
      let url = Router.url('/books/:category/:id', 'programming', 4, {
        query: { page: 3, limit: 10 },
      });
      expect(url).toBe('/books/programming/4?page=3&limit=10');
      url = Router.url('/books/:category/:id', { category: 'programming', id: 4 }, { query: { page: 3, limit: 10 } });
      expect(url).toBe('/books/programming/4?page=3&limit=10');
      url = Router.url('/books/:category/:id', { category: 'programming', id: 4 }, { query: 'page=3&limit=10' });
      expect(url).toBe('/books/programming/4?page=3&limit=10');
    });

    it('generates router URL without params and with with query params', () => {
      const url = Router.url('/category', {
        query: { page: 3, limit: 10 },
      });
      expect(url).toBe('/category?page=3&limit=10');
    });
  });
});
