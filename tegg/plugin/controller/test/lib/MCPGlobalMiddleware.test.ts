import assert from 'node:assert/strict';

import compose from 'koa-compose';
import { describe, it } from 'vitest';

import { MCPControllerRegister } from '../../src/lib/impl/mcp/MCPControllerRegister.ts';

// Unit tests for the lazy MCP global-middleware resolution.
//
// MCPControllerRegister.register() runs during the tegg load-unit init
// (postCreate), which happens before egg's `loadMiddleware` populates
// `app.middlewares`. The middleware named in `config.mcp.middleware` must
// therefore be resolved lazily — on the first request — rather than at
// registration time, otherwise booting an app that configures `mcp.middleware`
// throws `Middleware <name> not found`.
function createRegister(mcp: any, middlewares: any) {
  const app: any = {
    eggContainerFactory: {},
    router: {},
    config: { mcp },
    middlewares,
  };
  const register = new (MCPControllerRegister as any)({}, {}, app);
  return { register, app };
}

describe('plugin/controller/test/lib/MCPGlobalMiddleware.test.ts', () => {
  it('does not read app.middlewares at registration time', () => {
    // app.middlewares is still empty here, mirroring registration time.
    const { register } = createRegister({ middleware: ['trace'] }, {});
    const base: any = async (_ctx: any, next: any) => next();

    // Wrapping the base middleware must not throw even though `trace` is not yet
    // available; resolution is deferred to the first request.
    assert.doesNotThrow(() => register.composeGlobalMiddleware(() => base));
    assert.equal(register.globalMiddlewares, undefined);
  });

  it('resolves and runs the configured global middleware on first request', async () => {
    const { register, app } = createRegister({ middleware: ['trace'] }, {});
    const order: string[] = [];
    const base: any = async (_ctx: any, next: any) => {
      order.push('base');
      return next();
    };
    const wrapped = register.composeGlobalMiddleware(() => base);

    // app.middlewares is populated later by loadMiddleware.
    app.middlewares.trace = () => async (_ctx: any, next: any) => {
      order.push('trace');
      return next();
    };

    await wrapped({} as any, async () => {
      order.push('handler');
    });

    assert.deepEqual(order, ['base', 'trace', 'handler']);
    assert.ok(register.globalMiddlewares, 'built and cached after first request');
  });

  it('resolves and composes the global chain once across requests', async () => {
    const { register, app } = createRegister({ middleware: ['m'] }, {});
    let factoryCalls = 0;
    app.middlewares.m = () => {
      factoryCalls++;
      return async (_ctx: any, next: any) => next();
    };
    const base: any = async (_ctx: any, next: any) => next();
    const wrapped = register.composeGlobalMiddleware(() => base);

    await wrapped({} as any, async () => {});
    await wrapped({} as any, async () => {});

    // The middleware factory is only invoked on the first request; the composed
    // chain is cached and reused afterwards.
    assert.equal(factoryCalls, 1);
  });

  it('getGlobalMiddleware is idempotent (builds once)', () => {
    const { register } = createRegister({ middleware: [] }, {});
    register.getGlobalMiddleware();
    const first = register.globalMiddlewares;
    register.getGlobalMiddleware();
    assert.equal(register.globalMiddlewares, first);
  });

  it('still surfaces a genuinely missing middleware at resolution time', () => {
    // The fix defers *when* middlewares are resolved; it must not hide a real
    // misconfiguration — an unknown name still throws once resolved.
    const { register } = createRegister({ middleware: ['nope'] }, {});
    assert.throws(() => register.getGlobalMiddleware(), /Middleware nope not found/);
  });

  it('defers the base middleware factory to the first request', async () => {
    // `app.middleware.teggCtxLifecycleMiddleware` is loaded by egg's
    // loadMiddleware, which runs *after* controller registration. The base
    // middleware must therefore be acquired via a thunk on the first request,
    // not eagerly — otherwise registration throws
    // `teggCtxLifecycleMiddleware is not a function`.
    const { register } = createRegister({ middleware: [] }, {});
    let baseFactoryCalls = 0;
    const base: any = async (_ctx: any, next: any) => next();
    const wrapped = register.composeGlobalMiddleware(() => {
      baseFactoryCalls++;
      return base;
    });

    // Wrapping does not resolve the base middleware.
    assert.equal(baseFactoryCalls, 0);

    await wrapped({} as any, async () => {});
    await wrapped({} as any, async () => {});

    // Resolved exactly once, on the first request, then cached.
    assert.equal(baseFactoryCalls, 1);
  });

  it('wires the lazy middleware into the MCP route setup without touching app.middlewares', () => {
    // The route-setup methods run during registration (before loadMiddleware).
    // They must install the lazy wrapper without resolving app.middlewares and
    // without invoking the base teggCtxLifecycleMiddleware factory (which is not
    // loaded onto app.middleware until after registration).
    let baseMiddlewareCalls = 0;
    const app: any = {
      eggContainerFactory: {},
      router: { post() {}, get() {}, del() {}, all() {} },
      middleware: {
        teggCtxLifecycleMiddleware: () => {
          baseMiddlewareCalls++;
          return async (_ctx: any, next: any) => next();
        },
      },
      config: { mcp: { middleware: ['trace'] } },
      middlewares: {}, // 'trace' not loaded yet
    };
    const register = new (MCPControllerRegister as any)({}, {}, app);

    assert.doesNotThrow(() => register.mcpStatelessStreamServerInit());
    assert.doesNotThrow(() => register.mcpStreamServerInit());
    assert.doesNotThrow(() => register.mcpServerRegister());
    // sseCtxStorageRun wires the same lazy wrapper per SSE connection.
    assert.doesNotThrow(() => register.sseCtxStorageRun({} as any, {} as any, 'default'));
    // Still not resolved — both the global middlewares and the base middleware
    // are deferred to the first request.
    assert.equal(register.globalMiddlewares, undefined);
    assert.equal(baseMiddlewareCalls, 0);
  });

  it('keeps koa-compose onion ordering for multiple global middlewares', async () => {
    const { register, app } = createRegister({ middleware: ['a', 'b'] }, {});
    const order: string[] = [];
    const make = (name: string) => () => async (_ctx: any, next: any) => {
      order.push(`${name}:before`);
      await next();
      order.push(`${name}:after`);
    };
    app.middlewares.a = make('a');
    app.middlewares.b = make('b');
    const base: any = async (_ctx: any, next: any) => {
      order.push('base');
      return next();
    };
    const wrapped = register.composeGlobalMiddleware(() => base);
    await wrapped({} as any, async () => order.push('handler'));
    assert.deepEqual(order, ['base', 'a:before', 'b:before', 'handler', 'b:after', 'a:after']);
    assert.equal(typeof compose, 'function');
  });
});
