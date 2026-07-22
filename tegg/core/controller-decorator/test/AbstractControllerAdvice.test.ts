import assert from 'node:assert/strict';

import type { AdviceContext, ControllerAdviceContext } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { AbstractControllerAdvice } from '../src/index.ts';

describe('AbstractControllerAdvice', () => {
  it('forwards around to middleware', async () => {
    const controllerContext = { value: 'controller' };
    const adviceContext = {
      controllerContext,
      that: {},
      method: 'hello',
      args: [],
      get: () => undefined,
      set() {
        return this;
      },
    } satisfies ControllerAdviceContext<typeof controllerContext>;
    const calls: string[] = [];

    class TestControllerAdvice extends AbstractControllerAdvice<typeof controllerContext> {
      async middleware(ctx: typeof controllerContext, next: () => Promise<any>, context: AdviceContext): Promise<void> {
        assert.equal(ctx, controllerContext);
        assert.equal(context, adviceContext);
        calls.push('before');
        await next();
        calls.push('after');
      }
    }

    await new TestControllerAdvice().around(adviceContext, async () => {
      calls.push('handler');
    });

    assert.deepEqual(calls, ['before', 'handler', 'after']);
  });
});
