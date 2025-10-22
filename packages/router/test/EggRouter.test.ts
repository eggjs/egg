import is from 'is-type-of';
import { Application } from '@eggjs/koa';
import request from '@eggjs/supertest';
import { describe, it, expect } from 'vitest';

import { EggRouter } from '../src/index.ts';

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
    expect(res.body.url).toBe('/');
    expect(res.body.method).toBe('GET');
  });

  it('creates new router with egg app', () => {
    const app = { controller: {} };
    const router = new EggRouter({}, app);
    expect(router).toBeDefined();
    ['head', 'options', 'get', 'put', 'patch', 'post', 'delete', 'all', 'resources'].forEach((method) => {
      expect(Reflect.get(router, method)).toBeInstanceOf(Function);
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
    expect(() => {
      router.post('/hello/world', app.controller.hello.world as any);
    }).toThrow(/post `\/hello\/world`: Please use async function instead of generator function/);
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

    expect(router.stack[0].path).toBe('/foo');
    expect(router.stack[0].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[0].stack.length).toBe(1);
    expect(router.stack[1].path).toBe('/hello/world');
    expect(router.stack[1].methods).toEqual(['POST']);
    expect(router.stack[1].stack.length).toBe(1);

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

    expect(router.stack[0].path).toBe('/foo');
    expect(router.stack[0].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[0].stack.length).toBe(1);
    expect(router.stack[1].path).toBe('/bar');
    expect(router.stack[1].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[2].stack.length).toBe(1);
    expect(router.stack[2].path).toBe('/hello/world');
    expect(router.stack[2].methods).toEqual(['POST']);
    expect(router.stack[2].stack.length).toBe(1);
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

    expect(router.stack[0].name).toBe('foo');
    expect(router.stack[0].path).toBe('/foo');
    expect(router.stack[0].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[0].stack.length).toBe(1);
    expect(router.stack[1].name).toBe('hello');
    expect(router.stack[1].path).toBe('/hello/world');
    expect(router.stack[1].methods).toEqual(['POST']);
    expect(router.stack[1].stack.length).toBe(1);
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

    expect(router.stack[0].name).toBe('foo');
    expect(router.stack[0].path).toBe('/foo');
    expect(router.stack[0].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[0].stack.length).toBe(1);
    expect(router.stack[1].name).toBe('hello');
    expect(router.stack[1].path).toBe('/hello/world');
    expect(router.stack[1].methods).toEqual(['POST']);
    expect(router.stack[1].stack.length).toBe(1);
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

    expect(router.stack[0].name).toBe('foo');
    expect(router.stack[0].path).toBe('/foo');
    expect(router.stack[0].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[0].stack.length).toBe(1);
    expect(router.stack[1].name).toBe('hello.world');
    expect(router.stack[1].path).toBe('/hello/world');
    expect(router.stack[1].methods).toEqual(['POST']);
    expect(router.stack[1].stack.length).toBe(1);
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

    expect(router.stack[0].name).toBe('foo');
    expect(router.stack[0].path).toBe('/foo');
    expect(router.stack[0].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[0].stack.length).toBe(1);
    expect(router.stack[1].name).toBe('foo');
    expect(router.stack[1].path).toBe('/bar');
    expect(router.stack[1].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[1].stack.length).toBe(1);
    expect(router.stack[2].name).toBe('hello.world');
    expect(router.stack[2].path).toBe('/hello/world');
    expect(router.stack[2].methods).toEqual(['POST']);
    expect(router.stack[2].stack.length).toBe(1);

    expect(router.stack[3].name).toBe('other');
    expect(router.stack[3].path).toBe('/other1');
    expect(router.stack[3].methods).toEqual(['PUT']);
    expect(router.stack[3].stack.length).toBe(1);
    expect(router.stack[4].name).toBe('other');
    expect(router.stack[4].path).toBe('/other2');
    expect(router.stack[4].methods).toEqual(['PUT']);
    expect(router.stack[4].stack.length).toBe(1);
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

    expect(router.stack[0].name).toBe('foo');
    expect(router.stack[0].path instanceof RegExp).toBe(true);
    expect(router.stack[0].path.toString()).toBe(String(/^\/foo/));
    expect(router.stack[0].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[0].stack.length).toBe(1);
    expect(router.stack[1].name).toBe('hello.world');
    expect(router.stack[1].path instanceof RegExp).toBe(true);
    expect(router.stack[1].path.toString()).toBe(String(/^\/hello\/world/));
    expect(router.stack[1].methods).toEqual(['POST']);
    expect(router.stack[1].stack.length).toBe(1);

    expect(router.stack[2].name).toBe(undefined);
    expect(router.stack[2].path instanceof RegExp).toBe(true);
    expect(router.stack[2].path.toString()).toBe(String(/^\/hello\/world2/));
    expect(router.stack[2].methods).toEqual(['POST']);
    expect(router.stack[2].stack.length).toBe(2);
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
    expect(() => {
      router.get('foo', '/foo', 'foobar');
    }).toThrow(/app.controller.foobar not exists/);

    expect(() => {
      router.get('/foo', (app as any).bar);
    }).toThrow(/controller not exists/);
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

    expect(router.stack[0].name).toBe('foo');
    expect(router.stack[0].path).toBe('/foo');
    expect(router.stack[0].methods).toEqual(['HEAD', 'GET']);
    expect(router.stack[0].stack.length).toBe(4);
    expect(is.generatorFunction(router.stack[0].stack[0])).toBe(false);
    expect(is.asyncFunction(router.stack[0].stack[1])).toBe(true);
    expect(is.generatorFunction(router.stack[0].stack[3])).toBe(false);
    expect(router.stack[1].name).toBe('hello');
    expect(router.stack[1].path).toBe('/hello/world');
    expect(router.stack[1].methods).toEqual(['POST']);
    expect(router.stack[1].stack.length).toBe(4);
    expect(is.generatorFunction(router.stack[1].stack[0])).toBe(false);
    expect(is.asyncFunction(router.stack[1].stack[1])).toBe(true);
    expect(is.generatorFunction(router.stack[1].stack[3])).toBe(false);
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
    expect(router.stack.length).toBe(5);
    expect(router.stack[0].stack.length).toBe(2);

    router.resources('api_post', '/api/post', app.controller.post);
    expect(router.stack.length).toBe(10);
    expect(router.stack[5].stack.length).toBe(1);
    expect(router.stack[5].name).toBe('api_posts');
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
    expect(router.stack.length).toBe(5);
    expect(router.stack[0].stack.length).toBe(3);

    router.resources('api_post', '/api/post', asyncMiddleware1, asyncMiddleware2, app.controller.post);
    expect(router.stack.length).toBe(10);
    expect(router.stack[5].stack.length).toBe(3);
    expect(router.stack[5].name).toBe('api_posts');
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

    expect(router.url('post', { id: 1, foo: [1, 2], bar: 'bar' })).toBe('/post/1?foo=1&foo=2&bar=bar');
    expect(router.url('post', { foo: [1, 2], bar: 'bar' })).toBe('/post/:id?foo=1&foo=2&bar=bar');
    expect(router.url('fooo')).toBe('');
    expect(router.url('hello')).toBe('/hello/world');

    expect(router.pathFor('post', { id: 1, foo: [1, 2], bar: 'bar' })).toBe('/post/1?foo=1&foo=2&bar=bar');
    expect(router.pathFor('fooo')).toBe('');
    expect(router.pathFor('hello')).toBe('/hello/world');
  });
});
