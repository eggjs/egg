import assert from 'assert';
import path from 'path';

import mm from '@eggjs/mock';
import { describe, beforeAll, afterAll, beforeEach, afterEach, it } from 'vitest';

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

describe('vitest adapter ctx semantics', () => {
  const getCtx = () => app.ctxStorage.getStore();
  let beforeCtx: any;
  let afterCtx: any;
  const beforeEachCtxList: Record<string, any> = {};
  const afterEachCtxList: Record<string, any> = {};
  const itCtxList: Record<string, any> = {};

  beforeAll(() => {
    beforeCtx = getCtx();
  });

  afterAll(async () => {
    afterCtx = getCtx();
    assert(beforeCtx);
    assert(beforeCtx !== itCtxList.foo);
    assert(itCtxList.foo !== itCtxList.bar);
    assert.strictEqual(afterCtx, beforeCtx);
    assert.strictEqual(beforeEachCtxList.foo, afterEachCtxList.foo);
    assert.strictEqual(beforeEachCtxList.foo, itCtxList.foo);
    await app.close();
    await mm.restore();
  });

  describe('foo', () => {
    beforeEach(() => {
      beforeEachCtxList.foo = getCtx();
    });

    it('should work', () => {
      itCtxList.foo = getCtx();
    });

    afterEach(() => {
      afterEachCtxList.foo = getCtx();
    });
  });

  describe('bar', () => {
    beforeEach(() => {
      beforeEachCtxList.bar = getCtx();
    });

    it('should work', () => {
      itCtxList.bar = getCtx();
    });

    afterEach(() => {
      afterEachCtxList.bar = getCtx();
    });
  });

  describe('multi it', () => {
    const multiItCtxList: any[] = [];

    it('should work 1', () => {
      multiItCtxList.push(getCtx());
    });

    it('should work 2', () => {
      multiItCtxList.push(getCtx());
    });

    afterAll(() => {
      assert(multiItCtxList[0] !== multiItCtxList[1]);
    });
  });
});
