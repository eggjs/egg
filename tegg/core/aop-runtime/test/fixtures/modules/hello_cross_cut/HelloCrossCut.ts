import assert from 'node:assert';

import { AccessLevel, Inject } from '@eggjs/core-decorator';
import { Advice, Crosscut } from '@eggjs/aop-decorator';
import { type AdviceContext, type IAdvice, PointcutType } from '@eggjs/tegg-types';

import { Hello } from '../hello_succeed/Hello.ts';
import { CallTrace } from './CallTrace.ts';

export const crosscutAdviceParams = {
  cross: Math.random().toString(),
  cut: Math.random().toString(),
};

@Crosscut(
  {
    type: PointcutType.CLASS,
    clazz: Hello,
    methodName: 'hello',
  },
  { adviceParams: crosscutAdviceParams }
)
@Advice({
  accessLevel: AccessLevel.PUBLIC,
})
export class CrosscutAdvice implements IAdvice<Hello, string> {
  @Inject()
  callTrace: CallTrace;

  async beforeCall(ctx: AdviceContext<Hello, {}>): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, crosscutAdviceParams);
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'beforeCall',
      id: ctx.that.id,
      name: ctx.args[0],
      adviceParams: ctx.adviceParams,
    });
  }

  async afterReturn(ctx: AdviceContext<Hello>, result: any): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, crosscutAdviceParams);
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'afterReturn',
      id: ctx.that.id,
      name: ctx.args[0],
      result,
      adviceParams: ctx.adviceParams,
    });
  }

  async afterFinally(ctx: AdviceContext<Hello>): Promise<void> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, crosscutAdviceParams);
    this.callTrace.addMsg({
      className: CrosscutAdvice.name,
      methodName: 'afterFinally',
      id: ctx.that.id,
      name: ctx.args[0],
      adviceParams: ctx.adviceParams,
    });
  }

  async around(ctx: AdviceContext<Hello>, next: () => Promise<any>): Promise<any> {
    assert.ok(ctx.adviceParams);
    assert.deepStrictEqual(ctx.adviceParams, crosscutAdviceParams);
    ctx.args[0] = `withCrosscutAroundParam(${ctx.args[0]})`;
    const result = await next();
    return `withCrossAroundResult(${result}${JSON.stringify(ctx.adviceParams)})`;
  }
}
