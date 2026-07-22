import assert from 'node:assert/strict';

import type { EggContainerFactory } from '@eggjs/tegg-runtime';
import type { AdviceContext, ControllerAdviceContext, EggProtoImplClass } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { executeControllerAdvices } from '../src/lib/ControllerAdvice.ts';

describe('executeControllerAdvices', () => {
  it('resolves Advice through DI and passes the real invocation context', async () => {
    const calls: string[] = [];
    const target = { name: 'controller' };

    class TestAdvice {
      async around(adviceContext: AdviceContext, next: () => Promise<any>): Promise<void> {
        assert.deepEqual((adviceContext as ControllerAdviceContext).controllerContext, { value: 'ok' });
        assert.equal(adviceContext.that, target);
        assert.equal(adviceContext.method, 'hello');
        assert.deepEqual(adviceContext.args, ['before']);
        adviceContext.args = ['after'];
        calls.push('before');
        await next();
        calls.push('after');
      }
    }

    const containerFactory = {
      async getOrCreateEggObjectFromClazz(clazz: EggProtoImplClass, name?: string) {
        assert.equal(clazz, TestAdvice);
        assert.equal(name, 'controller-advice:test');
        return { obj: new TestAdvice() };
      },
    } as unknown as typeof EggContainerFactory;
    const result = await executeControllerAdvices(
      { value: 'ok' },
      target,
      'hello',
      ['before'],
      [{ clazz: TestAdvice, objectName: 'controller-advice:test' }],
      containerFactory,
      async (that, args) => {
        assert.equal(that, target);
        assert.deepEqual(args, ['after']);
        calls.push('handler');
        return 'result';
      },
    );

    assert.deepEqual(calls, ['before', 'handler', 'after']);
    assert.equal(result, 'result');
  });

  it('continues when an Advice has no around hook', async () => {
    class BeforeCallOnlyAdvice {
      async beforeCall(): Promise<void> {
        assert.fail('host middleware only executes around');
      }
    }
    const containerFactory = {
      async getOrCreateEggObjectFromClazz() {
        return { obj: new BeforeCallOnlyAdvice() };
      },
    } as unknown as typeof EggContainerFactory;

    const result = await executeControllerAdvices(
      {},
      {},
      'hello',
      [],
      [{ clazz: BeforeCallOnlyAdvice, objectName: 'controller-advice:before-call-only' }],
      containerFactory,
      async () => 'result',
    );

    assert.equal(result, 'result');
  });

  it('rejects an Advice that calls next more than once', async () => {
    class InvalidAdvice {
      async around(_ctx: AdviceContext, next: () => Promise<any>): Promise<void> {
        await next();
        await next();
      }
    }
    const containerFactory = {
      async getOrCreateEggObjectFromClazz() {
        return { obj: new InvalidAdvice() };
      },
    } as unknown as typeof EggContainerFactory;

    await assert.rejects(
      () =>
        executeControllerAdvices(
          {},
          {},
          'hello',
          [],
          [{ clazz: InvalidAdvice, objectName: 'controller-advice:invalid' }],
          containerFactory,
          async () => {},
        ),
      /controller advice next\(\) called multiple times/,
    );
  });
});
