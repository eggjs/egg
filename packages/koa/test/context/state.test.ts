import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import Koa from '../../src/index.ts';

describe('ctx.state', () => {
  it('should provide a ctx.state namespace', () => {
    const app = new Koa();

    app.use(ctx => {
      assert.deepEqual(ctx.state, {});
      ctx.state.user = 'example';
    });

    app.use(ctx => {
      assert.deepEqual(ctx.state, { user: 'example' });
    });

    const server = app.listen();

    return request(server).get('/').expect(404);
  });

  it('should override state getter', () => {
    const app = new Koa();
    app.ContextClass = class extends app.ContextClass {
      get state(): Record<string, string> {
        return { foo: 'bar' };
      }
    };

    app.use(ctx => {
      assert.deepEqual(ctx.state, { foo: 'bar' });
      // @ts-expect-error for testing
      ctx.state.user = 'example';
    });

    app.use(ctx => {
      assert.deepEqual(ctx.state, { foo: 'bar' });
    });

    const server = app.listen();

    return request(server).get('/').expect(404);
  });
});
