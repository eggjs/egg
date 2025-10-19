import assert from 'node:assert/strict';
import path from 'node:path';

import { describe, it, beforeEach, afterEach } from 'vitest';
import { LoadUnitFactory } from '@eggjs/tegg-metadata';
import { type LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { EggTestContext, CoreTestHelper } from '@eggjs/module-test-util';

import { HelloService } from './fixtures/modules/dynamic-inject-module/HelloService.js';

describe('test/dynamic-inject-runtime.test.ts', () => {
  let modules: Array<LoadUnitInstance>;
  beforeEach(async () => {
    modules = await CoreTestHelper.prepareModules([
      path.join(__dirname, '..'),
      path.join(__dirname, 'fixtures/modules/dynamic-inject-module'),
    ]);
  });

  afterEach(async () => {
    for (const module of modules) {
      await LoadUnitFactory.destroyLoadUnit(module.loadUnit);
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(module);
    }
  });

  it('should work', async () => {
    await EggTestContext.mockContext(async () => {
      const helloService = await CoreTestHelper.getObject(HelloService);
      const msgs = await helloService.hello();
      assert.deepStrictEqual(msgs, [
        'hello, foo(context:0)',
        'hello, bar(context:0)',
        'hello, foo(singleton:0)',
        'hello, bar(singleton:0)',
      ]);
    });

    await EggTestContext.mockContext(async () => {
      const helloService = await CoreTestHelper.getObject(HelloService);
      const msgs = await helloService.hello();
      assert.deepStrictEqual(msgs, [
        'hello, foo(context:0)',
        'hello, bar(context:0)',
        // singleton use the same object
        // counter should has cache
        'hello, foo(singleton:1)',
        'hello, bar(singleton:1)',
      ]);
    });
  });

  it('should work with getAllEggObjects', async () => {
    await EggTestContext.mockContext(async () => {
      const helloService = await CoreTestHelper.getObject(HelloService);
      const msgs = await helloService.sayHelloToAll();
      assert.deepStrictEqual(msgs, [
        'hello, bar(singleton:0)',
        'hello, foo(singleton:0)',
        'hello, bar(context:0)',
        'hello, foo(context:0)',
      ]);
    });
  });
});
