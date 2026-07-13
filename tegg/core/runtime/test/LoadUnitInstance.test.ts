import assert from 'node:assert';
import path from 'node:path';
import { mock } from 'node:test';

import { EggPrototypeFactory } from '@eggjs/metadata';
import { CoreTestHelper, LoaderUtil } from '@eggjs/module-test-util';
import { type LoadUnitInstance } from '@eggjs/tegg-types';
import { describe, beforeEach, afterEach, beforeAll, afterAll, it } from 'vitest';

import { EggContainerFactory } from '../src/index.js';
import { ContextHandler } from '../src/model/ContextHandler.js';
import { EggContextStorage } from './fixtures/EggContextStorage.js';
import { EggTestContext } from './fixtures/EggTestContext.ts';
import { Bar, Foo } from './fixtures/modules/extends-module/Base.js';
import CountController from './fixtures/modules/module-for-load-unit-instance/CountController.js';
import { FOO_ATTRIBUTE, FooLogger } from './fixtures/modules/multi-instance-module/MultiInstance.js';
import { FooLoggerConstructor } from './fixtures/modules/multi-instance-module/MultiInstanceConstructor.js';
import AppService from './fixtures/modules/multi-module/multi-module-service/AppService.js';
import TestUtil from './util.js';

describe('test/LoadUnit/LoadUnitInstance.test.ts', () => {
  describe('ModuleLoadUnitInstance', () => {
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

    it('should create success', async () => {
      const instance = await TestUtil.createLoadUnitInstance('module-for-load-unit-instance');
      const countControllerProto = EggPrototypeFactory.instance.getPrototype('countController');
      const countControllerObj = await EggContainerFactory.getOrCreateEggObject(
        countControllerProto,
        countControllerProto.name,
      );
      const countController = countControllerObj.obj as CountController;
      const countResult = await countController.getCount();
      assert.deepStrictEqual(countResult, {
        serviceCount: 0,
        serviceTempCount: 0,
        controllerTempCount: 0,
      });

      const countResult2 = await countController.getCount();
      assert.deepStrictEqual(countResult2, {
        serviceCount: 1,
        serviceTempCount: 1,
        controllerTempCount: 1,
      });

      await TestUtil.destroyLoadUnitInstance(instance);
    });

    it('should load extends class success', async () => {
      const instance = await TestUtil.createLoadUnitInstance('extends-module');
      const barProto = EggPrototypeFactory.instance.getPrototype('bar', instance.loadUnit);
      const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
      const bar = barObj.obj as Bar;

      const fooProto = EggPrototypeFactory.instance.getPrototype('foo', instance.loadUnit);
      const fooObj = await EggContainerFactory.getOrCreateEggObject(fooProto, fooProto.name);
      const foo = fooObj.obj as Foo;
      assert(bar.foo);
      assert(bar.logger);
      assert(foo.logger);
      await TestUtil.destroyLoadUnitInstance(instance);
    });

    it.skip('should load multi instance', async () => {
      const instance = await TestUtil.createLoadUnitInstance('multi-instance-module');
      const foo1Proto = EggPrototypeFactory.instance.getPrototype('foo', instance.loadUnit, [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo1',
        },
      ]);
      const foo1Obj = await EggContainerFactory.getOrCreateEggObject(foo1Proto, foo1Proto.name);
      const foo1 = foo1Obj.obj as FooLogger;

      const foo2Proto = EggPrototypeFactory.instance.getPrototype('foo', instance.loadUnit, [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo2',
        },
      ]);
      const foo2Obj = await EggContainerFactory.getOrCreateEggObject(foo2Proto, foo2Proto.name);
      const foo2 = foo2Obj.obj as FooLogger;
      assert(foo1);
      assert(foo2);
      assert(foo1 !== foo2);
      assert(foo1.loadUnitPath);
      assert.equal(foo1.foo, 'foo1');
      assert(foo2.loadUnitPath);
      assert.equal(foo2.foo, 'foo2');

      const obj1 = await EggContainerFactory.getOrCreateEggObjectFromClazz(FooLogger, 'foo', [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo1',
        },
      ]);
      const obj2 = await EggContainerFactory.getOrCreateEggObjectFromClazz(FooLogger, 'foo', [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo2',
        },
      ]);
      assert(foo1Obj === obj1);
      assert(foo2Obj === obj2);

      await TestUtil.destroyLoadUnitInstance(instance);
    });

    it.skip('should load multi instance with constructor', async () => {
      const instance = await TestUtil.createLoadUnitInstance('multi-instance-module');
      const foo1Proto = EggPrototypeFactory.instance.getPrototype('fooConstructor', instance.loadUnit, [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo1',
        },
      ]);
      const foo1Obj = await EggContainerFactory.getOrCreateEggObject(foo1Proto, foo1Proto.name);
      const foo1 = foo1Obj.obj as FooLoggerConstructor;

      const foo2Proto = EggPrototypeFactory.instance.getPrototype('fooConstructor', instance.loadUnit, [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo2',
        },
      ]);
      const foo2Obj = await EggContainerFactory.getOrCreateEggObject(foo2Proto, foo2Proto.name);
      const foo2 = foo2Obj.obj as FooLoggerConstructor;
      assert(foo1);
      assert(foo2);
      assert(foo1 !== foo2);
      assert(foo1.foo === 'foo1');
      assert(foo2.foo === 'foo2');
      assert(foo1.bar === 'bar');
      assert(foo2.foo === 'foo2');

      const obj1 = await EggContainerFactory.getOrCreateEggObjectFromClazz(FooLogger, 'fooConstructor', [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo1',
        },
      ]);
      const obj2 = await EggContainerFactory.getOrCreateEggObjectFromClazz(FooLogger, 'fooConstructor', [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo2',
        },
      ]);
      assert(foo1Obj === obj1);
      assert(foo2Obj === obj2);

      await TestUtil.destroyLoadUnitInstance(instance);
    });
  });

  describe('MultiModule', () => {
    let commonInstance: LoadUnitInstance;
    let repoInstance: LoadUnitInstance;
    let serviceInstance: LoadUnitInstance;
    let innerInstance: LoadUnitInstance;

    beforeAll(async () => {
      EggContextStorage.register();
      const builtGraph = await LoaderUtil.buildGlobalGraph([
        path.join(__dirname, 'fixtures/modules/multi-module/multi-module-common'),
        path.join(__dirname, 'fixtures/modules/multi-module/multi-module-repo'),
        path.join(__dirname, 'fixtures/modules/multi-module/multi-module-service'),
      ]);
      innerInstance = builtGraph.innerObjectLoadUnitInstance;
      commonInstance = await TestUtil.createLoadUnitInstance('multi-module/multi-module-common', false);
      repoInstance = await TestUtil.createLoadUnitInstance('multi-module/multi-module-repo', false);
      serviceInstance = await TestUtil.createLoadUnitInstance('multi-module/multi-module-service', false);
    });

    afterAll(async () => {
      await CoreTestHelper.destroyModules([commonInstance, repoInstance, serviceInstance, innerInstance]);
    });

    it('should get appService', async () => {
      const saveCtx = new EggTestContext();
      const findCtx = new EggTestContext();
      const saveAppServiceProto = EggPrototypeFactory.instance.getPrototype('appService', serviceInstance.loadUnit);
      const [saveAppService, findAppService] = await Promise.all([
        ContextHandler.run(saveCtx, async () => {
          const saveAppServiceObj = await EggContainerFactory.getOrCreateEggObject(
            saveAppServiceProto,
            saveAppServiceProto.name,
          );
          const saveAppService = saveAppServiceObj.obj as AppService;
          await saveAppService.save({
            name: 'mock-app',
            desc: 'mock-desc',
          });
          return saveAppService;
        }),
        ContextHandler.run(findCtx, async () => {
          const findAppServiceObj = await EggContainerFactory.getOrCreateEggObject(
            saveAppServiceProto,
            saveAppServiceProto.name,
          );
          const findAppService = findAppServiceObj.obj as AppService;
          return findAppService;
        }),
      ]);
      // not same service because ctx is different
      assert(saveAppService !== findAppService);

      const app = await findAppService.findApp('mock-app');
      assert.deepStrictEqual(app, {
        name: 'mock-app',
        desc: 'mock-desc',
      });
    });
  });
});
