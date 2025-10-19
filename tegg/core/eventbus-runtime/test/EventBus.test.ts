import path from 'node:path';
import { mock } from 'node:test';
import assert from 'node:assert/strict';

import { describe, it, beforeEach, afterEach } from 'vitest';
import { type LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { type EggPrototype, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { TimerUtil } from '@eggjs/tegg-common-util';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { EventInfoUtil, CORK_ID } from '@eggjs/eventbus-decorator';
import { CoreTestHelper, EggTestContext } from '@eggjs/module-test-util';

import { EventContextFactory, EventHandlerFactory, SingletonEventBus } from '../src/index.ts';

import { HelloHandler, HelloProducer } from './fixtures/modules/event/HelloEvent.ts';
import { Timeout0Handler, Timeout100Handler, TimeoutProducer } from './fixtures/modules/event/MultiEvent.ts';
import { MultiWithContextHandler, MultiWithContextProducer } from './fixtures/modules/event/MultiEventWithContext.ts';

describe('test/EventBus.test.ts', () => {
  let modules: Array<LoadUnitInstance>;
  beforeEach(async () => {
    modules = await CoreTestHelper.prepareModules([
      path.join(__dirname, 'fixtures/modules/mock-module'),
      path.join(__dirname, '..'),
      path.join(__dirname, 'fixtures/modules/event'),
    ]);
  });

  afterEach(async () => {
    for (const module of modules) {
      await LoadUnitFactory.destroyLoadUnit(module.loadUnit);
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(module);
    }
    mock.reset();
  });

  it('should work', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(HelloHandler)!,
        PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype
      );

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const helloProducer = await CoreTestHelper.getObject(HelloProducer);
      const helloHandler = await CoreTestHelper.getObject(HelloHandler);
      const helloEvent = eventBus.await('hello');
      let msg: string | undefined;
      mock.method(helloHandler, 'handle', async (m: string) => {
        msg = m;
      });
      helloProducer.trigger();

      await helloEvent;
      assert(msg === '01');
    });
  });

  it('should work with EventContext', async function () {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      EventInfoUtil.getEventNameList(MultiWithContextHandler).forEach(eventName =>
        eventHandlerFactory.registerHandler(
          eventName,
          PrototypeUtil.getClazzProto(MultiWithContextHandler) as EggPrototype
        )
      );

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const producer = await CoreTestHelper.getObject(MultiWithContextProducer);
      const fooEvent = eventBus.await('foo');
      producer.foo();
      await fooEvent;
      assert.equal(MultiWithContextHandler.eventName, 'foo');
      assert.equal(MultiWithContextHandler.msg, '123');
      const barEvent = eventBus.await('bar');
      producer.bar();
      await barEvent;
      assert.equal(MultiWithContextHandler.eventName, 'bar');
      assert.equal(MultiWithContextHandler.msg, '321');
    });
  });

  it('EventBus.awaitFirst should work', async function () {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      EventInfoUtil.getEventNameList(MultiWithContextHandler).forEach(eventName =>
        eventHandlerFactory.registerHandler(
          eventName,
          PrototypeUtil.getClazzProto(MultiWithContextHandler) as EggPrototype
        )
      );

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const producer = await CoreTestHelper.getObject(MultiWithContextProducer);
      const fooEvent = eventBus.awaitFirst('foo', 'bar');
      producer.foo();
      await fooEvent;
      assert.equal(MultiWithContextHandler.eventName, 'foo');
      assert.equal(MultiWithContextHandler.msg, '123');
    });
  });

  it('EventHandlerFactory.getHandlers should work', async function () {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      EventInfoUtil.getEventNameList(MultiWithContextHandler).forEach(eventName =>
        eventHandlerFactory.registerHandler(
          eventName,
          PrototypeUtil.getClazzProto(MultiWithContextHandler) as EggPrototype
        )
      );
      const handlers = await eventHandlerFactory.getHandlers('foo');
      assert.equal(handlers.length, 1);
      const handler = handlers[0];
      assert(handler instanceof MultiWithContextHandler);
      await Reflect.apply(handler.handle, handler, [{ eventName: 'foo' }, '123']);
      assert.equal(MultiWithContextHandler.eventName, 'foo');
      assert.equal(MultiWithContextHandler.msg, '123');
    });
  });

  it('destroy should be called', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      let destroyCalled = false;
      mock.method(ctx, 'destroy', async () => {
        destroyCalled = true;
      });
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(HelloHandler)!,
        PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype
      );

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const helloProducer = await CoreTestHelper.getObject(HelloProducer);
      const helloEvent = eventBus.await('hello');

      helloProducer.trigger();

      await helloEvent;
      assert(destroyCalled);
    });
  });

  it('should wait all handler done', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(Timeout0Handler)!,
        PrototypeUtil.getClazzProto(Timeout0Handler) as EggPrototype
      );
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(Timeout100Handler)!,
        PrototypeUtil.getClazzProto(Timeout100Handler) as EggPrototype
      );

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const timeoutProducer = await CoreTestHelper.getObject(TimeoutProducer);
      const timeoutEvent = eventBus.await('timeout');
      timeoutProducer.trigger();

      await timeoutEvent;
      assert(Timeout100Handler.called);
    });
  });

  it('cork should work', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(HelloHandler)!,
        PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype
      );

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const corkId = eventBus.generateCorkId();
      ctx.set(CORK_ID, corkId);
      eventBus.cork(corkId);

      const helloHandler = await CoreTestHelper.getObject(HelloHandler);
      const helloEvent = eventBus.await('hello');
      let eventTime = 0;
      mock.method(helloHandler, 'handle', async () => {
        eventTime = Date.now();
      });
      eventBus.emitWithContext(ctx, 'hello', ['01']);
      const triggerTime = Date.now();

      await TimerUtil.sleep(100);
      eventBus.uncork(corkId);
      await helloEvent;
      assert(eventTime >= triggerTime + 100);
    });
  });

  it('multi cork should work', async () => {
    await EggTestContext.mockContext(async (ctx: EggTestContext) => {
      const eventContextFactory = await CoreTestHelper.getObject(EventContextFactory);
      eventContextFactory.registerContextCreator(() => {
        return ctx;
      });
      const eventHandlerFactory = await CoreTestHelper.getObject(EventHandlerFactory);
      eventHandlerFactory.registerHandler(
        EventInfoUtil.getEventName(HelloHandler)!,
        PrototypeUtil.getClazzProto(HelloHandler) as EggPrototype
      );

      const eventBus = await CoreTestHelper.getObject(SingletonEventBus);
      const corkId = eventBus.generateCorkId();
      ctx.set(CORK_ID, corkId);
      eventBus.cork(corkId);
      eventBus.cork(corkId);

      const helloHandler = await CoreTestHelper.getObject(HelloHandler);
      const helloEvent = eventBus.await('hello');
      let eventTime = 0;
      mock.method(helloHandler, 'handle', async () => {
        eventTime = Date.now();
      });
      eventBus.emitWithContext(ctx, 'hello', ['01']);
      const triggerTime = Date.now();

      await TimerUtil.sleep(100);
      eventBus.uncork(corkId);
      await TimerUtil.sleep(100);
      eventBus.uncork(corkId);

      await helloEvent;
      assert(eventTime >= triggerTime + 200);
    });
  });
});
