import { Transactional } from '@eggjs/transaction-decorator';
import { describe, expect, it } from 'vitest';

import { TransactionPrototypeHook } from '../src/lib/TransactionPrototypeHook.ts';

describe('plugin/dal/test/TransactionPrototypeHook.test.ts', () => {
  const logger = {
    info() {},
  } as any;

  it('should skip transaction hook when module has no dataSource config', async () => {
    class FooService {
      @Transactional()
      async doSomething() {}
    }

    const hook = new TransactionPrototypeHook(
      {
        foo: {
          config: {},
        },
      } as any,
      logger,
    );

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

    const hook = new TransactionPrototypeHook(
      {
        bar: {
          config: {
            dataSource: {},
          },
        },
      } as any,
      logger,
    );

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
