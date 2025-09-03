import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { Application, Context } from '../../src/index.ts';

describe('app.context', () => {
  const app1 = new Application();
  app1.context.msg = 'hello app1';
  const app2 = new Application();
  app2.request.foo = 'bar';

  it('should the context between apps is isolated', () => {
    assert.notEqual(app1.context, app2.context);
    assert.equal(app1.context.msg, 'hello app1');
    assert.equal(app1.request.foo, undefined);
    assert.equal(app2.context.msg, undefined);
    assert.equal(app2.request.foo, 'bar');
  });

  it('should merge properties', () => {
    app1.use(ctx => {
      assert.equal(ctx.msg, 'hello app1');
      assert.equal(ctx.request.foo, undefined);
      ctx.status = 204;
    });

    return request(app1.listen()).get('/').expect(204);
  });

  it('should not affect the original prototype', () => {
    app2.use(ctx => {
      assert.equal(ctx.msg, undefined);
      assert.equal(ctx.request.foo, 'bar');
      ctx.status = 204;
    });

    return request(app2.listen()).get('/').expect(204);
  });

  describe('Sub Class', () => {
    class MyContext extends Context {
      getMsg() {
        return 'world';
      }
    }

    class MyApp extends Application {
      constructor() {
        super();
        this.ContextClass = MyContext;
      }
    }

    const app = new MyApp();
    app.use((ctx: MyContext) => {
      ctx.body = `hello, ${ctx.getMsg()}`;
    });

    it('should work with sub class', () => {
      return request(app.listen()).get('/').expect(200, 'hello, world');
    });
  });
});
