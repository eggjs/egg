import assert from 'node:assert';
import { mock } from 'node:test';
import { describe, beforeEach, afterEach, it } from 'vitest';
import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import TestUtil from './util.js';
import { EggTestContext } from './fixtures/EggTestContext.js';
import CacheService from './fixtures/modules/init-type-qualifier-module/CacheService.js';
import { EggContainerFactory, ContextHandler } from '../src/index.js';

describe('test/LoadUnit/QualifierLoadUnitInstance.test.ts', () => {
  let ctx: EggTestContext;

  beforeEach(() => {
    ctx = new EggTestContext();
    mock.method(ContextHandler, 'getContext', () => {
      return ctx;
    });
  });

  afterEach(async () => {
    await ctx.destroy({});
    mock.reset();
  });

  describe('init type qualifier', () => {
    it('should work', async () => {
      const instance = await TestUtil.createLoadUnitInstance('init-type-qualifier-module');
      const cacheServiceProto = EggPrototypeFactory.instance.getPrototype('cacheService', instance.loadUnit);
      const cacheServiceObj = await EggContainerFactory.getOrCreateEggObject(cacheServiceProto, cacheServiceProto.name);
      const cacheService = cacheServiceObj.obj as CacheService;
      cacheService.setContextCache('cacheKey', 'cacheVal');
      cacheService.setSingletonCache('cacheKey', 'cacheVal');
      const contextCache = cacheService.getContextCache('cacheKey');
      assert.deepStrictEqual(contextCache, {
        val: 'cacheVal',
        from: 'context',
      });
      const singletonCache = cacheService.getSingletonCache('cacheKey');
      assert.deepStrictEqual(singletonCache, {
        val: 'cacheVal',
        from: 'singleton',
      });

      await TestUtil.destroyLoadUnitInstance(instance);
    });
  });
});
