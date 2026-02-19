import assert from 'assert';
import { createRequire } from 'module';
import path from 'path';

import mm from '@eggjs/mock';
import { describe, beforeAll, afterAll, it } from 'vitest';

import { configureTeggRunner } from '../src/index.ts';

const require = createRequire(import.meta.url);
const { HelloService } = require(path.join(__dirname, 'fixtures/apps/demo-app/modules/demo-module/HelloService'));

const app = mm.app({
  baseDir: path.join(__dirname, 'fixtures/apps/demo-app'),
  framework: require.resolve('egg'),
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

  it('injects ctx and service', () => {
    const ctx = app.ctxStorage.getStore();
    assert(ctx);
    assert.strictEqual(ctx.service.hello.sayHi('Ada'), 'hi Ada');
  });

  it('supports ctx.getEggObject()', async () => {
    const ctx = app.ctxStorage.getStore();
    assert(ctx);
    const helloService = (await ctx.getEggObject(HelloService)) as any;
    assert.strictEqual(helloService.sayHi('Ada'), 'hi Ada');
  });
});
