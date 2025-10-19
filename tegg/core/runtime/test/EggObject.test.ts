import assert from 'node:assert';
import { mock } from 'node:test';
import { describe, beforeEach, afterEach, it } from 'vitest';
import { EggPrototypeFactory } from '@eggjs/tegg-metadata';
import { EggTestContext } from './fixtures/EggTestContext.js';
import TestUtil from './util.js';
import { EggContainerFactory } from '../src/index.js';
import { Foo, Bar } from './fixtures/modules/lifecycle-hook/object.js';
import { Bar as ExtendsBar } from './fixtures/modules/extends-module/Base.js';
import { ContextHandler } from '../src/model/ContextHandler.js';
import { SingletonBar } from './fixtures/modules/inject-context-to-singleton/object.js';
import { SingletonConstructorBar } from './fixtures/modules/inject-constructor-context-to-singleton/object.js';

describe('test/EggObject.test.ts', () => {
  let ctx: EggTestContext;

  beforeEach(() => {
    ctx = new EggTestContext();
  });

  afterEach(() => {
    mock.reset();
  });

  describe('lifecycle', () => {
    beforeEach(() => {
      mock.method(ContextHandler, 'getContext', () => {
        return ctx;
      });
    });

    describe('context proto', () => {
      it('should work', async () => {
        const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
        const fooProto = EggPrototypeFactory.instance.getPrototype('foo');
        const fooObj = await EggContainerFactory.getOrCreateEggObject(fooProto, fooProto.name);
        const foo = fooObj.obj as Foo;
        await TestUtil.destroyLoadUnitInstance(instance);
        const called = foo.getLifecycleCalled();
        await ctx.destroy({});
        assert.deepStrictEqual(called, [
          'construct',
          'postConstruct',
          'preInject',
          'postInject',
          'init',
          'preDestroy',
          'destroy',
        ]);
      });

      it('should clear eggObjectMap/eggObjectPromiseMap/contextData after destroy', async () => {
        const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
        const fooProto = EggPrototypeFactory.instance.getPrototype('foo');
        const fooObj = await EggContainerFactory.getOrCreateEggObject(fooProto, fooProto.name);
        assert(fooObj.obj);
        await ctx.destroy({});
        await TestUtil.destroyLoadUnitInstance(instance);

        // should clear all maps
        const assertCtx = ctx as any;
        assert(!assertCtx.eggObjectMap.size);
        assert(!assertCtx.eggObjectPromiseMap.size);
        assert(!assertCtx.contextData.size);
      });
    });

    describe('singleton proto', () => {
      it('should work', async () => {
        const instance = await TestUtil.createLoadUnitInstance('lifecycle-hook');
        const barProto = EggPrototypeFactory.instance.getPrototype('bar');
        const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
        const bar = barObj.obj as Bar;
        // get obj from class
        const barObj2 = await EggContainerFactory.getOrCreateEggObjectFromClazz((barProto as any).clazz, barProto.name);
        assert.equal(barObj2, barObj);
        assert.equal(barObj2.obj, barObj.obj);

        // get obj from name
        const barObj3 = await EggContainerFactory.getOrCreateEggObjectFromName('bar');
        assert.equal(barObj3, barObj);
        assert.equal(barObj3.obj, barObj.obj);

        await TestUtil.destroyLoadUnitInstance(instance);
        const called = bar.getLifecycleCalled();
        assert.deepStrictEqual(called, [
          'construct',
          'postConstruct',
          'preInject',
          'postInject',
          'init',
          'preDestroy',
          'destroy',
        ]);
      });
    });
  });

  describe('inject context to singleton', () => {
    it('should work', async () => {
      mock.method(ContextHandler, 'getContext', () => {
        return;
      });
      const instance = await TestUtil.createLoadUnitInstance('inject-context-to-singleton');
      const barProto = EggPrototypeFactory.instance.getPrototype('singletonBar');
      mock.method(ContextHandler, 'getContext', () => {
        return ctx;
      });
      const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
      const bar = barObj.obj as SingletonBar;
      const msg = await bar.hello();
      assert(msg === 'hello from depth2');
      await TestUtil.destroyLoadUnitInstance(instance);
      await ctx.destroy({});
    });
  });

  describe('constructor inject context to singleton', () => {
    it('should work', async () => {
      mock.method(ContextHandler, 'getContext', () => {
        return;
      });
      const instance = await TestUtil.createLoadUnitInstance('inject-constructor-context-to-singleton');
      const barProto = EggPrototypeFactory.instance.getPrototype('singletonConstructorBar');
      mock.method(ContextHandler, 'getContext', () => {
        return ctx;
      });
      const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
      const bar = barObj.obj as SingletonConstructorBar;
      const msg = await bar.hello();
      assert(msg === 'hello from depth2');
      await TestUtil.destroyLoadUnitInstance(instance);
      await ctx.destroy({});
    });
  });

  describe('property mock', () => {
    beforeEach(() => {
      mock.method(ContextHandler, 'getContext', () => {
        return ctx;
      });
    });

    it('should work', async () => {
      const instance = await TestUtil.createLoadUnitInstance('extends-module');
      const barProto = EggPrototypeFactory.instance.getPrototype('bar', instance.loadUnit);
      const barObj = await EggContainerFactory.getOrCreateEggObject(barProto, barProto.name);
      const bar = barObj.obj as ExtendsBar;
      const foo = {};
      mock.getter(bar, 'foo', () => foo);
      assert.equal(bar.foo, foo);

      await TestUtil.destroyLoadUnitInstance(instance);
      await ctx.destroy({});
    });
  });
});
