import { ModuleConfigs } from '@eggjs/tegg-common-util';
import { Transactional } from '@eggjs/transaction-decorator';
import { describe, expect, it } from 'vitest';

import { TransactionPrototypeHook } from '../src/lib/TransactionPrototypeHook.ts';

describe('plugin/dal/test/TransactionPrototypeHook.test.ts', () => {
  const logger = {
    info() {},
  } as any;

  function createHook(moduleConfigs: ConstructorParameters<typeof ModuleConfigs>[0]): TransactionPrototypeHook {
    const hook = new TransactionPrototypeHook();
    Object.assign(hook, {
      moduleConfigs: new ModuleConfigs(moduleConfigs),
      logger,
    });
    return hook;
  }

  it('should skip transaction hook when module has no dataSource config', async () => {
    class FooService {
      @Transactional()
      async doSomething() {}
    }

    const hook = createHook({
      foo: {
        config: {},
      } as any,
    });

    await expect(
      hook.preCreate({
        clazz: FooService,
        loadUnit: {
          name: 'foo',
        },
      } as any),
    ).resolves.toBeUndefined();
  });

  it('should skip transaction hook when module has empty dataSource config', async () => {
    class BarService {
      @Transactional({
        datasourceName: 'foo',
      })
      async doSomething() {}
    }

    const hook = createHook({
      bar: {
        config: {
          dataSource: {},
        },
      } as any,
    });

    await expect(
      hook.preCreate({
        clazz: BarService,
        loadUnit: {
          name: 'bar',
        },
      } as any),
    ).resolves.toBeUndefined();
  });
});
