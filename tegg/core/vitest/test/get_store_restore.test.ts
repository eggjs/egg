import assert from 'assert';
import path from 'path';

import mm from '@eggjs/mock';
import { describe, beforeAll, beforeEach, afterEach, afterAll, it } from 'vitest';

import { configureTeggRunner } from '../src/index.ts';

const app = mm.app({
  baseDir: path.join(__dirname, '../../..', 'plugin/tegg/test/fixtures/apps/egg-app'),
  framework: require.resolve('egg'),
});

configureTeggRunner({
  getApp() {
    return app as any;
  },
  restoreMocks: false,
});

describe('ctxStorage.getStore restore', () => {
  const getCtx = () => app.ctxStorage.getStore();
  let suiteCtx: any;
  const testCtxList: any[] = [];
  const afterEachCtxList: any[] = [];

  beforeAll(() => {
    suiteCtx = getCtx();
    assert(suiteCtx);
  });

  beforeEach(() => {
    const current = getCtx();
    testCtxList.push(current);
    assert(current);
    assert.notStrictEqual(current, suiteCtx);
  });

  it('should have test context (1)', () => {
    const ctx = getCtx();
    assert(ctx);
    assert.notStrictEqual(ctx, suiteCtx);
  });

  it('should have test context (2)', () => {
    const ctx = getCtx();
    assert(ctx);
    assert.notStrictEqual(ctx, suiteCtx);
  });

  afterEach(() => {
    const current = getCtx();
    afterEachCtxList.push(current);
    assert.strictEqual(current, testCtxList[afterEachCtxList.length - 1]);
  });

  it('should not conflict with nested ctxStorage.run()', async () => {
    const outerCtx = getCtx();
    assert(outerCtx);
    assert.notStrictEqual(outerCtx, suiteCtx);

    // Nested ctxStorage.run() should see its own store
    const nestedCtx = app.mockContext(undefined, {
      mockCtxStorage: false,
      reuseCtxStorage: false,
    });
    await app.ctxStorage.run(nestedCtx, async () => {
      assert.strictEqual(getCtx(), nestedCtx);
      assert.notStrictEqual(getCtx(), outerCtx);
    });

    // After nested run() returns, outer context is restored
    assert.strictEqual(getCtx(), outerCtx);
  });

  it('should not conflict with concurrent ctxStorage.run()', async () => {
    const outerCtx = getCtx();
    assert(outerCtx);

    await Promise.all([
      app.ctxStorage.run(app.mockContext(undefined, { mockCtxStorage: false, reuseCtxStorage: false }), async () => {
        const innerCtx = getCtx();
        assert(innerCtx);
        assert.notStrictEqual(innerCtx, outerCtx);
      }),
      app.ctxStorage.run(app.mockContext(undefined, { mockCtxStorage: false, reuseCtxStorage: false }), async () => {
        const innerCtx = getCtx();
        assert(innerCtx);
        assert.notStrictEqual(innerCtx, outerCtx);
      }),
    ]);

    // After concurrent runs, outer context is restored
    assert.strictEqual(getCtx(), outerCtx);
  });

  afterAll(async () => {
    // After all tests, suite context is restored
    assert.strictEqual(getCtx(), suiteCtx);
    assert.strictEqual(testCtxList.length, afterEachCtxList.length);
    testCtxList.forEach((ctx, index) => {
      assert.notStrictEqual(ctx, suiteCtx);
      assert.strictEqual(ctx, afterEachCtxList[index]);
    });
    assert.notStrictEqual(testCtxList[0], testCtxList[1]);
    await app.close();
    await mm.restore();
  });
});
