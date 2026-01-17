import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, afterAll, beforeAll } from 'vite-plus/test';

import { BarService } from './fixtures/apps/optional-inject/app/modules/module-a/BarService.ts';
import { FooService } from './fixtures/apps/optional-inject/app/modules/module-a/FooService.ts';
import { BarConstructorService1 } from './fixtures/apps/same-name-singleton-and-context-proto/app/modules/module-bar/BarConstructorService1.ts';
import { BarConstructorService2 } from './fixtures/apps/same-name-singleton-and-context-proto/app/modules/module-bar/BarConstructorService2.ts';
import { BarService1 } from './fixtures/apps/same-name-singleton-and-context-proto/app/modules/module-bar/BarService1.ts';
import { BarService2 } from './fixtures/apps/same-name-singleton-and-context-proto/app/modules/module-bar/BarService2.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/Inject.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    return mm.restore();
  });

  describe('optional', () => {
    beforeAll(async () => {
      app = mm.app({
        baseDir: getAppBaseDir('optional-inject'),
      });
      await app.ready();
    });
    afterAll(async () => {
      await app.close();
    });

    it('should work with property', async () => {
      const barService: BarService = await app.getEggObject(BarService);
      const res = barService.bar();
      assert.deepStrictEqual(res, {
        nil1: 'Y',
        nil2: 'Y',
      });
    });

    it('should work with constructor', async () => {
      const fooService: FooService = await app.getEggObject(FooService);
      const res = fooService.foo();
      assert.deepStrictEqual(res, {
        nil1: 'Y',
        nil2: 'Y',
      });
    });
  });

  describe('default initType qualifier', async () => {
    beforeAll(async () => {
      app = mm.app({
        baseDir: getAppBaseDir('same-name-singleton-and-context-proto'),
      });
      await app.ready();
    });
    afterAll(async () => {
      await app.close();
    });

    it('should work with singletonProto', async () => {
      await app.mockModuleContextScope(async () => {
        const barService1: BarService1 = await app.getEggObject(BarService1);
        assert.strictEqual(barService1.type(), 'singleton');
      });
    });

    it('should work with contextProto', async () => {
      await app.mockModuleContextScope(async () => {
        const barService2: BarService2 = await app.getEggObject(BarService2);
        assert.strictEqual(barService2.type(), 'context');
      });
    });

    it('should work with singletonProto', async () => {
      await app.mockModuleContextScope(async () => {
        const barService1: BarConstructorService1 = await app.getEggObject(BarConstructorService1);
        assert.strictEqual(barService1.type(), 'singleton');
      });
    });

    it('should work with contextProto', async () => {
      await app.mockModuleContextScope(async () => {
        const barService2: BarConstructorService2 = await app.getEggObject(BarConstructorService2);
        assert.strictEqual(barService2.type(), 'context');
      });
    });
  });

  describe('invalid inject', () => {
    afterAll(async () => {
      await app.close();
    });

    it('should throw error if no proto found', async () => {
      app = mm.app({
        baseDir: getAppBaseDir('invalid-inject'),
      });
      await assert.rejects(app.ready(), /EggPrototypeNotFound: Object doesNotExist not found in LOAD_UNIT:a/);
    });
  });
});
