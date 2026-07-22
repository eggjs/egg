import assert from 'node:assert/strict';

import compose from 'koa-compose';
import { describe, it } from 'vitest';

import { EggMcpRouter } from '../../src/lib/impl/mcp/EggMcpRouter.ts';

// MCP routes are registered before Egg populates app.middlewares, so resolution
// must be deferred until the first request.
function createRegister(mcp: any, middlewares: any) {
  const app: any = {
    eggContainerFactory: {},
    router: {},
    config: { mcp },
    middlewares,
  };
  const register = new (EggMcpRouter as any)(app);
  return { register, app };
}

describe('plugin/controller/test/lib/MCPGlobalMiddleware.test.ts', () => {
  it('does not read app.middlewares at registration time', () => {
    const { register } = createRegister({ middleware: ['trace'] }, {});
    const base: any = async (_ctx: any, next: any) => next();

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
    const { register } = createRegister({ middleware: ['nope'] }, {});
    assert.throws(() => register.getGlobalMiddleware(), /Middleware nope not found/);
  });

  it('defers the base middleware factory to the first request', async () => {
    const { register } = createRegister({ middleware: [] }, {});
    let baseFactoryCalls = 0;
    const base: any = async (_ctx: any, next: any) => next();
    const wrapped = register.composeGlobalMiddleware(() => {
      baseFactoryCalls++;
      return base;
    });

    assert.equal(baseFactoryCalls, 0);

    await wrapped({} as any, async () => {});
    await wrapped({} as any, async () => {});

    assert.equal(baseFactoryCalls, 1);
  });

  it('wires the lazy middleware into the MCP route setup without touching app.middlewares', () => {
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
    const register = new (EggMcpRouter as any)(app);

    assert.doesNotThrow(() => register.mcpStatelessStreamServerInit());
    assert.doesNotThrow(() => register.mcpStreamServerInit());
    assert.doesNotThrow(() => register.mcpServerRegister());
    assert.doesNotThrow(() => register.sseCtxStorageRun({} as any, {} as any, 'default'));
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
