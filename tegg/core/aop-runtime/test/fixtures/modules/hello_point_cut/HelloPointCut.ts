import assert from 'node:assert';

import { AccessLevel, Inject } from '@eggjs/core-decorator';
import { Advice } from '@eggjs/aop-decorator';
import { type AdviceContext, type IAdvice } from '@eggjs/tegg-types';

import { Hello } from '../hello_succeed/Hello.ts';
import { CallTrace } from '../hello_cross_cut/CallTrace.ts';

export const pointcutAdviceParams = {
  point: Math.random().toString(),
  cut: Math.random().toString(),
};

// 测试aop修改ctx的args的值
const TEST_CTX_ARGS_VALUE = 123;

@Advice({
  accessLevel: AccessLevel.PUBLIC,
})
export class PointcutAdvice implements IAdvice<Hello> {
  @Inject()
  callTrace: CallTrace;

  async beforeCall(ctx: AdviceContext<Hello>): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'beforeCall',
      id: ctx.that.id,
      name: ctx.args[0],
      adviceParams: ctx.adviceParams,
    });
    ctx.args = [...ctx.args, TEST_CTX_ARGS_VALUE];
  }

  async afterReturn(ctx: AdviceContext<Hello>, result: any): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    assert.deepStrictEqual(ctx.args[ctx.args.length - 1], TEST_CTX_ARGS_VALUE);
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'afterReturn',
      id: ctx.that.id,
      name: ctx.args[0],
      result,
      adviceParams: ctx.adviceParams,
    });
  }

  async afterThrow(ctx: AdviceContext<Hello, any>, error: Error): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'afterThrow',
      id: ctx.that.id,
      name: ctx.args[0],
      result: error.message,
      adviceParams: ctx.adviceParams,
    });
  }

  async afterFinally(ctx: AdviceContext<Hello>): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    this.callTrace.addMsg({
      className: PointcutAdvice.name,
      methodName: 'afterFinally',
      id: ctx.that.id,
      name: ctx.args[0],
      adviceParams: ctx.adviceParams,
    });
  }

  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, pointcutAdviceParams);
    ctx.args[0] = `withPointAroundParam(${ctx.args[0]})`;
    const result = await next();
    return `withPointAroundResult(${result}${JSON.stringify(pointcutAdviceParams)})`;
  }
}
