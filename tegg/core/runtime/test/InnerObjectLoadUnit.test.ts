import assert from 'node:assert/strict';
import { mock } from 'node:test';

import {
  EggObjectLifecycleProto,
  Inject,
  InjectOptional,
  InnerObjectProto,
  LoadUnitLifecycleProto,
} from '@eggjs/core-decorator';
import { LifecycleInit, LifecyclePostInject } from '@eggjs/lifecycle';
import { EggPrototypeFactory, EggPrototypeNotFound, LoadUnitFactory } from '@eggjs/metadata';
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

import { InnerObjectLoadUnitBuilder, LoadUnitInstanceFactory } from '../src/index.ts';
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
      businessInstance = await TestUtil.createLoadUnitInstance('module-for-load-unit-instance');
      assert(UnitHook.createdUnits.includes(String(businessInstance.loadUnit.name)));
      assert(ObjectHook.hookedObjects.length > 0);

      await TestUtil.destroyLoadUnitInstance(businessInstance);
      businessInstance = undefined;

      // destroy is symmetric: hooks are deregistered with the inner instance
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(innerInstance);
      innerInstance = undefined;
      const createdCount = UnitHook.createdUnits.length;
      businessInstance = await TestUtil.createLoadUnitInstance('module-for-load-unit-instance');
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
});
