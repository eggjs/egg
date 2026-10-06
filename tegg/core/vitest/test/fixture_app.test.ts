import assert from 'assert';
import { createRequire } from 'module';
import path from 'path';

import mm from '@eggjs/mock';
import { describe, beforeAll, afterAll, it } from 'vitest';

import { configureTeggRunner } from '../src/index.ts';
import { HelloService } from './fixtures/apps/demo-app/modules/demo-module/HelloService.ts';

const require = createRequire(import.meta.url);

const app = mm.app({
  baseDir: path.join(__dirname, 'fixtures/apps/demo-app'),
  framework: path.dirname(require.resolve('egg/package.json')),
});

configureTeggRunner({
  getApp() {
    return app as any;
  },
  restoreMocks: false,
});

describe('fixture demo app', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await mm.restore();
  });

  it('injects ctx and getEggObject', async () => {
    const loadedModule = (await globalThis.__EGG_MODULE_IMPORTER__?.(
      path.join(__dirname, 'fixtures/apps/demo-app/modules/demo-module/HelloService.ts'),
    )) as { HelloService: typeof HelloService };
    assert.strictEqual(loadedModule.HelloService, HelloService);

    const ctx = app.ctxStorage.getStore();
    assert(ctx);
    const helloService = (await ctx.getEggObject(HelloService)) as any;
    assert.strictEqual(helloService.sayHi('Ada'), 'hi Ada');
  });

  let previousContext: any;
  let previousTeggContext: any;
  let previousService: HelloService | undefined;

  it('releases the previous scope and creates a new context on retry', { retry: 1 }, async () => {
    const ctx = app.ctxStorage.getStore();
    assert(ctx);
    const service = await ctx.getEggObject(HelloService);

    if (!previousContext) {
      previousContext = ctx;
      previousTeggContext = ctx.teggContext;
      previousService = service;
      throw new Error('retry with a new tegg context');
    }

    assert(ctx !== previousContext, 'retry must use a new request context');
    assert.strictEqual(previousTeggContext.destroyed, true);
    assert.notStrictEqual(service, previousService);
    assert.strictEqual(service.sayHi('Ada'), 'hi Ada');
  });
});
