import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import v8 from 'node:v8';

import { request } from '@eggjs/supertest';
import { afterEach, describe, it } from 'vitest';

import Koa from '../../src/index.ts';

describe('v8 startup snapshot', () => {
  const originalStartupSnapshot = v8.startupSnapshot;

  afterEach(() => {
    (v8 as Record<string, unknown>).startupSnapshot = originalStartupSnapshot;
  });

  it('should defer AsyncLocalStorage creation when building snapshot', () => {
    let deserializeCallback: { cb: (data: unknown) => void; data: unknown } | undefined;
    (v8 as Record<string, unknown>).startupSnapshot = {
      isBuildingSnapshot: () => true,
      addDeserializeCallback: (cb: (data: unknown) => void, data: unknown) => {
        deserializeCallback = { cb, data };
      },
    };

    const app = new Koa();
    assert.strictEqual(app.ctxStorage, null);
    assert.ok(deserializeCallback, 'deserialize callback should be registered');

    // simulate snapshot deserialization
    deserializeCallback.cb(deserializeCallback.data);
    assert.ok(app.ctxStorage! instanceof AsyncLocalStorage);
  });

  it('should return undefined for currentContext when ctxStorage is null', () => {
    (v8 as Record<string, unknown>).startupSnapshot = {
      isBuildingSnapshot: () => true,
      addDeserializeCallback: () => {},
    };

    const app = new Koa();
    assert.strictEqual(app.ctxStorage, null);
    assert.strictEqual(app.currentContext, undefined);
  });

  it('should work normally after deserialization', async () => {
    let deserializeCallback: { cb: (data: unknown) => void; data: unknown } | undefined;
    (v8 as Record<string, unknown>).startupSnapshot = {
      isBuildingSnapshot: () => true,
      addDeserializeCallback: (cb: (data: unknown) => void, data: unknown) => {
        deserializeCallback = { cb, data };
      },
    };

    const app = new Koa();

    // simulate snapshot deserialization
    deserializeCallback!.cb(deserializeCallback!.data);

    app.use(async (ctx) => {
      assert.equal(ctx, app.currentContext);
      ctx.body = 'ok';
    });

    await request(app.callback()).get('/').expect('ok');
    assert.strictEqual(app.currentContext, undefined);
  });

  it('should not defer when not building snapshot', () => {
    (v8 as Record<string, unknown>).startupSnapshot = {
      isBuildingSnapshot: () => false,
    };

    const app = new Koa();
    assert.ok(app.ctxStorage! instanceof AsyncLocalStorage);
  });

  it('should handle callback without ctxStorage during snapshot build', async () => {
    (v8 as Record<string, unknown>).startupSnapshot = {
      isBuildingSnapshot: () => true,
      addDeserializeCallback: () => {},
    };

    const app = new Koa();
    assert.strictEqual(app.ctxStorage, null);

    app.use(async (ctx) => {
      assert.strictEqual(app.currentContext, undefined);
      ctx.body = 'ok';
    });

    await request(app.callback()).get('/').expect('ok');
  });
});
