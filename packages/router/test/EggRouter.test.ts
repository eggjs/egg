import { strict as assert } from 'node:assert';
import is from 'is-type-of';
import { Application } from '@eggjs/koa';
import request from 'supertest';
import { EggRouter } from '../src/index.js';

describe('test/EggRouter.test.ts', () => {
  it('auto bind ctx to this on controller', async () => {
    const app = new Application();
    const router = new EggRouter({}, app as any);
    router.get('home', '/', function (this: any) {
      this.body = {
        url: this.router.url('home'),
        method: this.method,
      };
    });
    app.use(router.routes());
    const res = await request(app.callback()).get('/').expect(200);
    assert.equal(res.body.url, '/');
    assert.equal(res.body.method, 'GET');
  });

  it('creates new router with egg app', () => {
    const app = { controller: {} };
    const router = new EggRouter({}, app);
    assert(router);
    ['head', 'options', 'get', 'put', 'patch', 'post', 'delete', 'all', 'resources'].forEach(method => {
      assert.equal(typeof Reflect.get(router, method), 'function');
    });
  });

  it('should throw error on generator function', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          *world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get('/foo', app.controller.foo);
    assert.throws(
      () => {
        router.post('/hello/world', app.controller.hello.world as any);
      },
      (err: TypeError) => {
        assert(err instanceof TypeError);
        assert.equal(err.message, 'post `/hello/world`: Please use async function instead of generator function');
        return true;
      }
    );
  });

  it('should app.verb(url, controller) work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get('/foo', app.controller.foo);
    router.post('/hello/world', app.controller.hello.world);

    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, ['HEAD', 'GET']);
    assert(router.stack[0].stack.length === 1);
    assert(router.stack[1].path === '/hello/world');
    assert.deepEqual(router.stack[1].methods, ['POST']);
    assert(router.stack[1].stack.length === 1);

    router.head('/foo-head', app.controller.foo);
    router.options('/foo-options', app.controller.foo);
    router.put('/foo-put', app.controller.foo);
    router.patch('/foo-patch', app.controller.foo);
    router.delete('/foo-delete', app.controller.foo);
    router.all('/foo-all', app.controller.foo);
  });

  it('should app.verb([url1, url2], controller) work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get(['/foo', '/bar'], app.controller.foo);
    router.post('/hello/world', app.controller.hello.world);

    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, ['HEAD', 'GET']);
    assert(router.stack[0].stack.length === 1);
    assert(router.stack[1].path === '/bar');
    assert.deepEqual(router.stack[1].methods, ['HEAD', 'GET']);
    assert(router.stack[2].stack.length === 1);
    assert(router.stack[2].path === '/hello/world');
    assert.deepEqual(router.stack[2].methods, ['POST']);
    assert(router.stack[2].stack.length === 1);
  });

  it('should app.verb(name, url, controller) work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get('foo', '/foo', app.controller.foo);
    router.post('hello', '/hello/world', app.controller.hello.world);

    assert(router.stack[0].name === 'foo');
    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, ['HEAD', 'GET']);
    assert(router.stack[0].stack.length === 1);
    assert(router.stack[1].name === 'hello');
    assert(router.stack[1].path === '/hello/world');
    assert.deepEqual(router.stack[1].methods, ['POST']);
    assert(router.stack[1].stack.length === 1);
  });

  it('should app.verb(name, url, controllerString) work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get('foo', '/foo', 'foo');
    router.post('hello', '/hello/world', 'hello.world');

    assert(router.stack[0].name === 'foo');
    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, ['HEAD', 'GET']);
    assert(router.stack[0].stack.length === 1);
    assert(router.stack[1].name === 'hello');
    assert(router.stack[1].path === '/hello/world');
    assert.deepEqual(router.stack[1].methods, ['POST']);
    assert(router.stack[1].stack.length === 1);
  });

  it('should app.verb(url, controllerString) work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get('/foo', 'foo');
    router.post('/hello/world', 'hello.world');

    assert.equal(router.stack[0].name, 'foo');
    assert.equal(router.stack[0].path, '/foo');
    assert.deepEqual(router.stack[0].methods, ['HEAD', 'GET']);
    assert.equal(router.stack[0].stack.length, 1);
    assert.equal(router.stack[1].name, 'hello.world');
    assert.equal(router.stack[1].path, '/hello/world');
    assert.deepEqual(router.stack[1].methods, ['POST']);
    assert.equal(router.stack[1].stack.length, 1);
  });

  it('should app.verb(urls, controllerString) work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get(['/foo', '/bar'], 'foo');
    router.post('/hello/world', 'hello.world');
    router.put('other', ['/other1', '/other2'], 'foo');

    assert.equal(router.stack[0].name, 'foo');
    assert.equal(router.stack[0].path, '/foo');
    assert.deepEqual(router.stack[0].methods, ['HEAD', 'GET']);
    assert.equal(router.stack[0].stack.length, 1);
    assert.equal(router.stack[1].name, 'foo');
    assert.equal(router.stack[1].path, '/bar');
    assert.deepEqual(router.stack[1].methods, ['HEAD', 'GET']);
    assert.equal(router.stack[1].stack.length, 1);
    assert.equal(router.stack[2].name, 'hello.world');
    assert.equal(router.stack[2].path, '/hello/world');
    assert.deepEqual(router.stack[2].methods, ['POST']);
    assert.equal(router.stack[2].stack.length, 1);

    assert.equal(router.stack[3].name, 'other');
    assert.equal(router.stack[3].path, '/other1');
    assert.deepEqual(router.stack[3].methods, ['PUT']);
    assert.equal(router.stack[3].stack.length, 1);
    assert.equal(router.stack[4].name, 'other');
    assert.equal(router.stack[4].path, '/other2');
    assert.deepEqual(router.stack[4].methods, ['PUT']);
    assert.equal(router.stack[4].stack.length, 1);
  });

  it('should app.verb(urlRegex, controllerString) work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get(/^\/foo/, 'foo');
    router.post(/^\/hello\/world/, 'hello.world');
    router.post(/^\/hello\/world2/, () => {}, 'hello.world');

    assert.equal(router.stack[0].name, 'foo');
    assert(router.stack[0].path instanceof RegExp);
    assert.equal(router.stack[0].path.toString(), String(/^\/foo/));
    assert.deepEqual(router.stack[0].methods, ['HEAD', 'GET']);
    assert.equal(router.stack[0].stack.length, 1);
    assert.equal(router.stack[1].name, 'hello.world');
    assert(router.stack[1].path instanceof RegExp);
    assert.equal(router.stack[1].path.toString(), String(/^\/hello\/world/));
    assert.deepEqual(router.stack[1].methods, ['POST']);
    assert.equal(router.stack[1].stack.length, 1);

    assert.equal(router.stack[2].name, undefined);
    assert(router.stack[2].path instanceof RegExp);
    assert.equal(router.stack[2].path.toString(), String(/^\/hello\/world2/));
    assert.deepEqual(router.stack[2].methods, ['POST']);
    assert.equal(router.stack[2].stack.length, 2);
  });

  it('should app.verb() throw if not found controller', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const router = new EggRouter({}, app);
    assert.throws(() => {
      router.get('foo', '/foo', 'foobar');
    }, /app.controller.foobar not exists/);

    assert.throws(() => {
      router.get('/foo', (app as any).bar);
    }, /controller not exists/);
  });

  it('should app.verb(name, url, [middlewares], controllerString) work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };

    const asyncMiddleware1 = async function () {
      return;
    };
    const asyncMiddleware = async function () {
      return;
    };
    const commonMiddleware = function () {};

    const router = new EggRouter({}, app);
    router.get('foo', '/foo', asyncMiddleware1, asyncMiddleware, commonMiddleware, 'foo');
    router.post('hello', '/hello/world', asyncMiddleware1, asyncMiddleware, commonMiddleware, 'hello.world');
    router.get('foo', '/foo', asyncMiddleware1, asyncMiddleware, commonMiddleware, 'foo');
    router.post('hello', '/hello/world', asyncMiddleware1, asyncMiddleware, commonMiddleware, 'hello.world');

    assert(router.stack[0].name === 'foo');
    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, ['HEAD', 'GET']);
    assert(router.stack[0].stack.length === 4);
    assert(!is.generatorFunction(router.stack[0].stack[0]));
    assert(is.asyncFunction(router.stack[0].stack[1]));
    assert(!is.generatorFunction(router.stack[0].stack[3]));
    assert(router.stack[1].name === 'hello');
    assert(router.stack[1].path === '/hello/world');
    assert.deepEqual(router.stack[1].methods, ['POST']);
    assert(router.stack[1].stack.length === 4);
    assert(!is.generatorFunction(router.stack[1].stack[0]));
    assert(is.asyncFunction(router.stack[1].stack[1]));
    assert(!is.generatorFunction(router.stack[1].stack[3]));
  });

  it('should app.resource() work', () => {
    const app = {
      controller: {
        post: {
          async index() {
            return;
          },
          async show() {
            return;
          },
          async create() {
            return;
          },
          async update() {
            return;
          },
          async new() {
            return;
          },
        },
      },
    };

    const asyncMiddleware = async function () {
      return;
    };

    const router = new EggRouter({}, app);
    router.resources('/post', asyncMiddleware, app.controller.post);
    assert.equal(router.stack.length, 5);
    assert.equal(router.stack[0].stack.length, 2);

    router.resources('api_post', '/api/post', app.controller.post);
    assert.equal(router.stack.length, 10);
    assert.equal(router.stack[5].stack.length, 1);
    assert.equal(router.stack[5].name, 'api_posts');
  });

  it('should app.resources() with multiple middlewares work', () => {
    const app = {
      controller: {
        post: {
          async index() {
            return;
          },
          async show() {
            return;
          },
          async create() {
            return;
          },
          async update() {
            return;
          },
          async new() {
            return;
          },
        },
      },
    };

    const asyncMiddleware1 = async function () {
      return;
    };
    const asyncMiddleware2 = async function () {
      return;
    };

    const router = new EggRouter({}, app);
    router.resources('/post', asyncMiddleware1, asyncMiddleware2, app.controller.post);
    assert.equal(router.stack.length, 5);
    assert.equal(router.stack[0].stack.length, 3);

    router.resources('api_post', '/api/post', asyncMiddleware1, asyncMiddleware2, app.controller.post);
    assert.equal(router.stack.length, 10);
    assert.equal(router.stack[5].stack.length, 3);
    assert.equal(router.stack[5].name, 'api_posts');
  });

  it('should router.url work', () => {
    const app = {
      controller: {
        async foo() {
          return;
        },
        hello: {
          world() {
            return;
          },
        },
      },
    };
    const router = new EggRouter({}, app);
    router.get('post', '/post/:id', app.controller.foo);
    router.get('hello', '/hello/world', app.controller.hello.world);

    assert.equal(router.url('post', { id: 1, foo: [1, 2], bar: 'bar' }), '/post/1?foo=1&foo=2&bar=bar');
    assert.equal(router.url('post', { foo: [1, 2], bar: 'bar' }), '/post/:id?foo=1&foo=2&bar=bar');
    assert.equal(router.url('fooo'), '');
    assert.equal(router.url('hello'), '/hello/world');

    assert.equal(router.pathFor('post', { id: 1, foo: [1, 2], bar: 'bar' }), '/post/1?foo=1&foo=2&bar=bar');
    assert.equal(router.pathFor('fooo'), '');
    assert.equal(router.pathFor('hello'), '/hello/world');
  });
});
