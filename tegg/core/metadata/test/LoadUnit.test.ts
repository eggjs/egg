import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'vitest';
import { InitTypeQualifierAttribute, ObjectInitType } from '@eggjs/core-decorator';
import {
  EggLoadUnitType,
  GlobalGraph,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
  LoadUnitMultiInstanceProtoHook,
} from '../src/index.js';
import { TestLoader } from './fixtures/TestLoader.js';
import { FOO_ATTRIBUTE } from './fixtures/modules/multi-instance-module/MultiInstance.js';
// import { App } from './fixtures/modules/app-multi-inject-multi/app/modules/app/App';
// import { App2 } from './fixtures/modules/app-multi-inject-multi/app/modules/app2/App';
// import { BizManager } from './fixtures/modules/app-multi-inject-multi/app/modules/bar/BizManager';
// import { Secret } from './fixtures/modules/app-multi-inject-multi/app/modules/foo/Secret';
import { buildGlobalGraph } from './fixtures/LoaderUtil.js';

describe('test/LoadUnit/LoadUnit.test.ts', () => {
  beforeEach(() => {
    GlobalGraph.instance = undefined;
  });

  describe('inject with constructor', () => {
    it('should not inherit parent class', async () => {
      const extendsConstructorModule = path.join(__dirname, './fixtures/modules/extends-constructor-module');
      const loader = new TestLoader(extendsConstructorModule);

      await buildGlobalGraph([extendsConstructorModule], [loader]);

      const loadUnit = await LoadUnitFactory.createLoadUnit(extendsConstructorModule, EggLoadUnitType.MODULE, loader);

      const fooConstructor = loadUnit.getEggPrototype('fooConstructor', [
        { attribute: InitTypeQualifierAttribute, value: ObjectInitType.CONTEXT },
      ]);
      const fooConstructorLogger = loadUnit.getEggPrototype('fooConstructorLogger', [
        { attribute: InitTypeQualifierAttribute, value: ObjectInitType.CONTEXT },
      ]);

      assert.strictEqual(fooConstructor.length, 1);
      assert.strictEqual(fooConstructor[0].injectObjects!.length, 1);
      assert.strictEqual(fooConstructor[0].injectObjects![0].refName, 'bar');

      assert.strictEqual(fooConstructorLogger.length, 1);
      assert.strictEqual(fooConstructorLogger[0].injectObjects!.length, 2);
      assert.strictEqual(fooConstructorLogger[0].injectObjects![0].refName, 'bar');
      assert.strictEqual(fooConstructorLogger[0].injectObjects![1].refName, 'logger');
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });
  });
  describe('ModuleLoadUnit', () => {
    it('should create success', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/load-unit');
      const loader = new TestLoader(repoModulePath);
      await buildGlobalGraph([repoModulePath], [loader]);

      const loadUnit = await LoadUnitFactory.createLoadUnit(repoModulePath, EggLoadUnitType.MODULE, loader);
      assert(loadUnit.id === 'LOAD_UNIT:app-repo');
      assert(loadUnit.unitPath === repoModulePath);
      const appRepoProto = loadUnit.getEggPrototype('appRepo', [
        { attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON },
      ]);
      const sprintRepoProto = loadUnit.getEggPrototype('sprintRepo', [
        { attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON },
      ]);
      const userRepoProto = loadUnit.getEggPrototype('userRepo', [
        { attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON },
      ]);
      assert.strictEqual(appRepoProto.length, 1);
      assert.strictEqual(appRepoProto[0].className, 'AppRepo');
      assert.strictEqual(sprintRepoProto.length, 1);
      assert.strictEqual(userRepoProto.length, 1);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

    it('recursive deps should should throw error', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/recursive-load-unit');
      const loader = new TestLoader(repoModulePath);

      await assert.rejects(async () => {
        return await buildGlobalGraph([repoModulePath], [loader]);
      }, /proto has recursive deps/);
    });
  });

  describe('optional inject', () => {
    it('should success', async () => {
      const optionalInjectModulePath = path.join(__dirname, './fixtures/modules/optional-inject-module');
      const loader = new TestLoader(optionalInjectModulePath);
      await buildGlobalGraph([optionalInjectModulePath], [loader]);

      const loadUnit = await LoadUnitFactory.createLoadUnit(optionalInjectModulePath, EggLoadUnitType.MODULE, loader);
      const optionalInjectServiceProto = loadUnit.getEggPrototype('optionalInjectService', [
        { attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON },
      ]);
      assert.deepStrictEqual(optionalInjectServiceProto[0].injectObjects, []);
    });
  });

  describe('invalidate load unit', () => {
    it('should init failed', async () => {
      const invalidateModulePath = path.join(__dirname, './fixtures/modules/invalidate-module');
      const loader = new TestLoader(invalidateModulePath);
      await assert.rejects(
        async () => {
          await buildGlobalGraph([invalidateModulePath], [loader]);
          await LoadUnitFactory.createLoadUnit(invalidateModulePath, EggLoadUnitType.MODULE, loader);
        },
        (e: Error) => {
          assert(e.message.includes('Object persistenceService not found'));
          assert(e.message.includes('faq/TEGG_EGG_PROTO_NOT_FOUND'));
          return true;
        }
      );
    });

    it('should init failed with multi proto', async () => {
      const invalidateModulePath = path.join(__dirname, './fixtures/modules/invalid-multimodule');
      const loader = new TestLoader(invalidateModulePath);
      await assert.rejects(
        async () => {
          await buildGlobalGraph([invalidateModulePath], [loader]);
        },
        (e: Error) => {
          assert(e.message.includes('duplicate proto: invalidateService'));
          return true;
        }
      );
    });
  });

  describe('try use obj init type as property init type qualifier', () => {
    it('should get the right proto', async () => {
      const sameObjectModulePath = path.join(__dirname, './fixtures/modules/same-name-object');
      const loader = new TestLoader(sameObjectModulePath);
      await buildGlobalGraph([sameObjectModulePath], [loader]);
      const loadUnit = await LoadUnitFactory.createLoadUnit(sameObjectModulePath, EggLoadUnitType.MODULE, loader);
      const countServiceProto = loadUnit.getEggPrototype('countService', [])[0];
      assert(countServiceProto);
    });

    it('should use context proto first', async () => {
      const sameObjectModulePath = path.join(__dirname, './fixtures/modules/same-name-object');
      const loader = new TestLoader(sameObjectModulePath);
      await buildGlobalGraph([sameObjectModulePath], [loader]);
      const loadUnit = await LoadUnitFactory.createLoadUnit(sameObjectModulePath, EggLoadUnitType.MODULE, loader);
      const singletonProto = loadUnit.getEggPrototype('singletonCountService', [])[0];
      assert(singletonProto);
      const injectProto = singletonProto.injectObjects.find(t => t.objName === 'appCache');
      assert(injectProto);
      assert(injectProto.proto.initType === ObjectInitType.CONTEXT);
    });
  });

  describe('MultiInstance proto', () => {
    let loadUnitMultiInstanceProtoHook: LoadUnitMultiInstanceProtoHook;
    beforeEach(() => {
      loadUnitMultiInstanceProtoHook = new LoadUnitMultiInstanceProtoHook();
      LoadUnitLifecycleUtil.registerLifecycle(loadUnitMultiInstanceProtoHook);
    });

    afterEach(() => {
      LoadUnitLifecycleUtil.deleteLifecycle(loadUnitMultiInstanceProtoHook);
    });

    // TODO: multi instance proto not work
    it.skip('should load static work', async () => {
      const multiInstanceModule = path.join(__dirname, './fixtures/modules/multi-instance-module');
      const loader = new TestLoader(multiInstanceModule);
      await buildGlobalGraph([multiInstanceModule], [loader]);
      const loadUnit = await LoadUnitFactory.createLoadUnit(multiInstanceModule, EggLoadUnitType.MODULE, loader);
      assert.equal(loadUnit.id, 'LOAD_UNIT:multiInstanceModule');
      assert.equal(loadUnit.unitPath, multiInstanceModule);
      const foo1Prototype = loadUnit.getEggPrototype('foo', [{ attribute: FOO_ATTRIBUTE, value: 'foo1' }]);
      const foo2Prototype = loadUnit.getEggPrototype('foo', [{ attribute: FOO_ATTRIBUTE, value: 'foo2' }]);
      assert(foo1Prototype);
      console.log(foo1Prototype);
      assert.equal(foo1Prototype.length, 1);
      assert.equal(foo1Prototype[0].className, 'FooLogger');
      assert(foo2Prototype);
      assert.equal(foo2Prototype.length, 1);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

    it.skip('should load callback work', async () => {
      const multiCallbackInstanceModule = path.join(__dirname, './fixtures/modules/multi-callback-instance-module');
      const loader = new TestLoader(multiCallbackInstanceModule);
      await buildGlobalGraph([multiCallbackInstanceModule], [loader]);
      const loadUnit = await LoadUnitFactory.createLoadUnit(
        multiCallbackInstanceModule,
        EggLoadUnitType.MODULE,
        loader
      );
      assert.equal(loadUnit.id, 'LOAD_UNIT:multiCallbackInstanceModule');
      assert.equal(loadUnit.unitPath, multiCallbackInstanceModule);
      const foo1Prototype = loadUnit.getEggPrototype('foo', [{ attribute: FOO_ATTRIBUTE, value: 'foo' }]);
      const foo2Prototype = loadUnit.getEggPrototype('foo', [{ attribute: FOO_ATTRIBUTE, value: 'bar' }]);
      assert(foo1Prototype);
      assert.equal(foo1Prototype.length, 1);
      assert(foo2Prototype);
      assert.equal(foo2Prototype.length, 1);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

    it.skip('should multi instance inject multi instance work', async () => {
      const appInstanceModule = path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app');
      const app2InstanceModule = path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app2');
      const loader = new TestLoader(appInstanceModule);
      const loader2 = new TestLoader(app2InstanceModule);
      const fooInstanceModule = path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/foo');
      const barInstanceModule = path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/bar');
      const fooLoader = new TestLoader(fooInstanceModule);
      const barLoader = new TestLoader(barInstanceModule);
      await buildGlobalGraph(
        [appInstanceModule, app2InstanceModule, fooInstanceModule, barInstanceModule],
        [loader, loader2, fooLoader, barLoader]
      );
      const loadUnit = await LoadUnitFactory.createLoadUnit(appInstanceModule, EggLoadUnitType.MODULE, loader);
      const loadUnit2 = await LoadUnitFactory.createLoadUnit(app2InstanceModule, EggLoadUnitType.MODULE, loader2);

      const app1Prototype = loadUnit.getEggPrototype('app', []);
      const app2Prototype = loadUnit.getEggPrototype('app2', []);

      assert(app1Prototype);
      assert(app2Prototype);

      await LoadUnitFactory.destroyLoadUnit(loadUnit);
      await LoadUnitFactory.destroyLoadUnit(loadUnit2);
      LoadUnitMultiInstanceProtoHook.clear();
    });
  });
});
