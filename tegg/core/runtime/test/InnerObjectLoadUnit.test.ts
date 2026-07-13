import assert from 'node:assert/strict';
import path from 'node:path';
import { mock } from 'node:test';

import {
  DefineModuleQualifier,
  DefineModuleQualifierAttribute,
  EggObjectLifecycleProto,
  Inject,
  InjectOptional,
  InnerObjectProto,
  LoadUnitLifecycleProto,
} from '@eggjs/core-decorator';
import { LifecycleDestroy, LifecycleInit, LifecyclePostInject } from '@eggjs/lifecycle';
import { EggPrototypeFactory, EggPrototypeNotFound, GlobalGraph, LoadUnitFactory } from '@eggjs/metadata';
import { LoaderUtil } from '@eggjs/module-test-util';
import type {
  EggObject,
  EggObjectLifeCycleContext,
  LifecycleHook,
  LoadUnit,
  LoadUnitInstance,
  LoadUnitLifecycleContext,
} from '@eggjs/tegg-types';
import { AccessLevel } from '@eggjs/tegg-types';
import { afterEach, beforeEach, describe, it } from 'vitest';

import { InnerObjectLoadUnit, InnerObjectLoadUnitBuilder, LoadUnitInstanceFactory } from '../src/index.ts';
import { ContextHandler } from '../src/model/ContextHandler.ts';
import { EggTestContext } from './fixtures/EggTestContext.ts';
import TestUtil from './util.ts';

@InnerObjectProto({ accessLevel: AccessLevel.PUBLIC })
class FooInner {
  hello(): string {
    return 'foo';
  }
}

@InnerObjectProto()
class BarInner {
  @Inject()
  fooInner: FooInner;

  @Inject()
  logger: Console;
}

@LoadUnitLifecycleProto()
class UnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  static postInjectCalled = 0;
  static createdUnits: string[] = [];

  @Inject()
  barInner: BarInner;

  @LifecyclePostInject()
  protected onPostInject(): void {
    UnitHook.postInjectCalled++;
  }

  async postCreate(_ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    UnitHook.createdUnits.push(String(loadUnit.name));
  }
}

@EggObjectLifecycleProto()
class ObjectHook implements LifecycleHook<EggObjectLifeCycleContext, EggObject> {
  static interfaceInitCalled = 0;
  static decoratedInitCalled = 0;
  static hookedObjects: string[] = [];

  // Same name as the self-lifecycle interface method. A lifecycle proto only
  // runs decorator-declared self lifecycle, so this must NOT be invoked while
  // the hook object itself is created.
  async init(): Promise<void> {
    ObjectHook.interfaceInitCalled++;
  }

  @LifecycleInit()
  protected async realInit(): Promise<void> {
    ObjectHook.decoratedInitCalled++;
  }

  async postCreate(_ctx: EggObjectLifeCycleContext, obj: EggObject): Promise<void> {
    ObjectHook.hookedObjects.push(String(obj.proto.name));
  }
}

describe('core/runtime/test/InnerObjectLoadUnit.test.ts', () => {
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

  it('should instantiate inner objects, wire DI and auto register lifecycle protos', async () => {
    const builder = new InnerObjectLoadUnitBuilder();
    builder.addInnerObjectClazzList([FooInner, BarInner, UnitHook, ObjectHook], {
      name: 'test-inner-module',
      path: __dirname,
    });
    const innerLoadUnit = await builder.createLoadUnit({
      innerObjects: {
        logger: [{ obj: console }],
      },
    });
    let innerInstance: LoadUnitInstance | undefined;
    let businessInstance: LoadUnitInstance | undefined;
    try {
      innerInstance = await LoadUnitInstanceFactory.createLoadUnitInstance(innerLoadUnit);

      // inner object DI: class-proto inject + host-provided object inject
      const barProto = EggPrototypeFactory.instance.getPrototype('barInner', innerLoadUnit);
      const barObj = (innerInstance as any).getEggObject('barInner', barProto).obj as BarInner;
      assert.equal(barObj.fooInner.hello(), 'foo');
      assert.equal(barObj.logger, console);

      // decorator-declared self lifecycle ran; interface-name method did not
      assert.equal(UnitHook.postInjectCalled, 1);
      assert.equal(ObjectHook.decoratedInitCalled, 1);
      assert.equal(ObjectHook.interfaceInitCalled, 0);

      // lifecycle protos are live: a business load unit created afterwards is hooked
      const businessModulePath = path.join(import.meta.dirname, 'fixtures/modules/module-for-load-unit-instance');
      const descriptors = await LoaderUtil.loadModuleDescriptors([businessModulePath]);
      GlobalGraph.instance = await GlobalGraph.create(descriptors);
      GlobalGraph.instance.build();
      GlobalGraph.instance.sort();
      businessInstance = await TestUtil.createLoadUnitInstance('module-for-load-unit-instance', false);
      assert(UnitHook.createdUnits.includes(String(businessInstance.loadUnit.name)));
      assert(ObjectHook.hookedObjects.length > 0);

      await TestUtil.destroyLoadUnitInstance(businessInstance);
      businessInstance = undefined;

      // destroy is symmetric: hooks are deregistered with the inner instance
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(innerInstance);
      innerInstance = undefined;
      const createdCount = UnitHook.createdUnits.length;
      businessInstance = await TestUtil.createLoadUnitInstance('module-for-load-unit-instance', false);
      assert.equal(UnitHook.createdUnits.length, createdCount);
    } finally {
      if (businessInstance) {
        await TestUtil.destroyLoadUnitInstance(businessInstance);
      }
      if (innerInstance) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(innerInstance);
      }
      await LoadUnitFactory.destroyLoadUnit(innerLoadUnit);
    }
  });

  it('should throw on recursive inner object deps', async () => {
    @InnerObjectProto()
    class CycleA {
      @Inject()
      cycleB: object;
    }

    @InnerObjectProto()
    class CycleB {
      @Inject()
      cycleA: object;
    }

    const builder = new InnerObjectLoadUnitBuilder();
    builder.addInnerObjectClazzList([CycleA, CycleB], {
      name: 'cycle-module',
      path: __dirname,
    });
    await assert.rejects(async () => {
      await builder.createLoadUnit({ innerObjects: {} });
    }, /recursive deps/);
  });

  it('should reject non-class descriptors instead of silently skipping them', async () => {
    const loadUnit = new InnerObjectLoadUnit({
      protos: [{ protoImplType: 'non-class' } as any],
    });
    await assert.rejects(() => loadUnit.init(), /only accepts ClassProtoDescriptor/);
  });

  it('should throw on missing non-optional dependency', async () => {
    @InnerObjectProto()
    class BadInner {
      @Inject()
      notExists: object;
    }

    const builder = new InnerObjectLoadUnitBuilder();
    builder.addInnerObjectClazzList([BadInner], {
      name: 'bad-module',
      path: __dirname,
    });
    await assert.rejects(async () => {
      await builder.createLoadUnit({ innerObjects: {} });
    }, EggPrototypeNotFound);
  });

  it('should allow missing optional dependency and host-provided names', async () => {
    @InnerObjectProto()
    class TolerantInner {
      @InjectOptional()
      notExists?: object;

      @Inject()
      logger: Console;
    }

    const builder = new InnerObjectLoadUnitBuilder();
    builder.addInnerObjectClazzList([TolerantInner], {
      name: 'tolerant-module',
      path: __dirname,
    });
    const loadUnit = await builder.createLoadUnit({
      innerObjects: {
        logger: [{ obj: console }],
      },
    });
    let instance: LoadUnitInstance | undefined;
    try {
      instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      const proto = EggPrototypeFactory.instance.getPrototype('tolerantInner', loadUnit);
      const obj = (instance as any).getEggObject('tolerantInner', proto).obj as TolerantInner;
      assert.equal(obj.logger, console);
      assert.equal(obj.notExists, undefined);
    } finally {
      if (instance) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    }
  });

  it('should resolve same-name inner objects by define module qualifier', async () => {
    @InnerObjectProto({ name: 'sharedInner', accessLevel: AccessLevel.PUBLIC })
    class ModuleAInner {
      value = 'module-a';
    }

    @InnerObjectProto({ name: 'sharedInner', accessLevel: AccessLevel.PUBLIC })
    class ModuleBInner {
      value = 'module-b';
    }

    @InnerObjectProto()
    class QualifiedInnerConsumer {
      @Inject()
      @DefineModuleQualifier('module-b')
      sharedInner: { value: string };
    }

    const builder = new InnerObjectLoadUnitBuilder();
    builder.addInnerObjectClazzList([ModuleAInner], {
      name: 'module-a',
      path: '/module-a',
    });
    builder.addInnerObjectClazzList([ModuleBInner, QualifiedInnerConsumer], {
      name: 'module-b',
      path: '/module-b',
    });
    const loadUnit = await builder.createLoadUnit({ innerObjects: {} });
    let instance: LoadUnitInstance | undefined;
    try {
      assert.throws(
        () => {
          EggPrototypeFactory.instance.getPrototype('sharedInner', loadUnit);
        },
        (err) => {
          assert(err instanceof Error);
          assert.match(err.message, /multi proto found/);
          assert.match(err.message, /define:module-a@\/module-a/);
          assert.match(err.message, /define:module-b@\/module-b/);
          assert.match(err.message, /Symbol\(Qualifier\.DefineModule\)=module-a/);
          assert.match(err.message, /Symbol\(Qualifier\.DefineModule\)=module-b/);
          return true;
        },
      );
      const moduleAProto = EggPrototypeFactory.instance.getPrototype('sharedInner', loadUnit, [
        {
          attribute: DefineModuleQualifierAttribute,
          value: 'module-a',
        },
      ]);
      assert(moduleAProto.verifyQualifier({ attribute: DefineModuleQualifierAttribute, value: 'module-a' }));

      instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      const consumerProto = EggPrototypeFactory.instance.getPrototype('qualifiedInnerConsumer', loadUnit);
      const consumer = (instance as any).getEggObject('qualifiedInnerConsumer', consumerProto)
        .obj as QualifiedInnerConsumer;
      assert.equal(consumer.sharedInner.value, 'module-b');
    } finally {
      if (instance) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    }
  });

  it('should use app as default define module qualifier for provided inner objects', async () => {
    const providedShared = { value: 'provided' };

    @InnerObjectProto({ name: 'sharedHostObject', accessLevel: AccessLevel.PUBLIC })
    class ModuleSharedHostObject {
      value = 'module';
    }

    @InnerObjectProto()
    class ProvidedInnerConsumer {
      @Inject()
      @DefineModuleQualifier('app')
      sharedHostObject: { value: string };
    }

    const builder = new InnerObjectLoadUnitBuilder();
    builder.addInnerObjectClazzList([ModuleSharedHostObject, ProvidedInnerConsumer], {
      name: 'host-module',
      path: '/host-module',
    });
    const loadUnit = await builder.createLoadUnit({
      innerObjects: {
        sharedHostObject: [{ obj: providedShared }],
      },
    });
    let instance: LoadUnitInstance | undefined;
    try {
      const providedProto = EggPrototypeFactory.instance.getPrototype('sharedHostObject', loadUnit, [
        {
          attribute: DefineModuleQualifierAttribute,
          value: 'app',
        },
      ]);
      assert.equal(providedProto.getQualifier(DefineModuleQualifierAttribute), 'app');

      instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      const consumerProto = EggPrototypeFactory.instance.getPrototype('providedInnerConsumer', loadUnit);
      const consumer = (instance as any).getEggObject('providedInnerConsumer', consumerProto)
        .obj as ProvidedInnerConsumer;
      assert.equal(consumer.sharedHostObject, providedShared);
    } finally {
      if (instance) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    }
  });

  it('should preserve prototype order and destroy inner objects in reverse actual creation order', async () => {
    const events: string[] = [];

    @InnerObjectProto({ name: 'dependency' })
    class Dependency {
      alive = true;

      @LifecycleDestroy()
      destroy(): void {
        events.push('destroy:dependency');
        this.alive = false;
      }
    }

    @InnerObjectProto({ name: 'consumer' })
    class Consumer {
      @Inject()
      dependency: Dependency;

      @LifecycleDestroy()
      destroy(): void {
        assert.equal(this.dependency.alive, true);
        events.push('destroy:consumer');
      }
    }

    const builder = new InnerObjectLoadUnitBuilder();
    builder.addInnerObjectClazzList([Consumer, Dependency], { name: 'ordered', path: '/ordered' });
    const loadUnit = await builder.createLoadUnit({ innerObjects: {} });
    const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
    try {
      const consumerProto = EggPrototypeFactory.instance.getPrototype('consumer', loadUnit);
      await (instance as any).getOrCreateEggObject('consumer', consumerProto);
    } finally {
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    }
    assert.deepEqual(events, ['destroy:consumer', 'destroy:dependency']);
  });

  it('should preserve interleaved order for same-name qualified prototypes', async () => {
    const events: string[] = [];

    @InnerObjectProto({ name: 'shared' })
    class FirstShared {
      @LifecycleInit()
      init(): void {
        events.push('shared:first');
      }
    }

    @InnerObjectProto()
    class Middle {
      @LifecycleInit()
      init(): void {
        events.push('middle');
      }
    }

    @InnerObjectProto({ name: 'shared' })
    class SecondShared {
      @LifecycleInit()
      init(): void {
        events.push('shared:second');
      }
    }

    const builder = new InnerObjectLoadUnitBuilder();
    builder.addInnerObjectClazzList([FirstShared], { name: 'first', path: '/first' });
    builder.addInnerObjectClazzList([Middle], { name: 'middle', path: '/middle' });
    builder.addInnerObjectClazzList([SecondShared], { name: 'second', path: '/second' });
    const loadUnit = await builder.createLoadUnit({ innerObjects: {} });
    const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
    try {
      assert.deepEqual(events, ['shared:first', 'middle', 'shared:second']);
    } finally {
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    }
  });
});
