import type { AdviceContext, AspectAdvice, IAdvice } from '@eggjs/tegg-types';
import type { Middleware } from 'koa-compose';
import compose from 'koa-compose';

class InternalAdviceContext<T = Record<string, IAdvice>> {
  private readonly state: Map<PropertyKey, any>;
  that: T;
  method: PropertyKey;
  args: any[];

  constructor(that: T, method: PropertyKey, args: any[]) {
    this.state = new Map();
    this.that = that;
    this.method = method;
    this.args = args;
  }

  get(key: PropertyKey): any {
    return this.state.get(key);
  }

  set(key: PropertyKey, value: any): this {
    this.state.set(key, value);
    return this;
  }

  createCallContext(adviceParams?: any): AdviceContext<T> {
    return Object.create(this, {
      adviceParams: {
        value: adviceParams,
      },
    });
  }
}

export class AspectExecutor {
  obj: object;
  method: PropertyKey;
  aspectAdviceList: readonly AspectAdvice[];

  constructor(obj: object, method: PropertyKey, aspectAdviceList: readonly AspectAdvice[]) {
    this.obj = obj;
    this.method = method;
    this.aspectAdviceList = aspectAdviceList;
  }

  async execute(...args: any[]): Promise<unknown> {
    const ctx = new InternalAdviceContext(this.obj as Record<string, IAdvice>, this.method, args);
    await this.beforeCall(ctx);
    try {
      const result = await this.doExecute(ctx);
      await this.afterReturn(ctx, result);
      return result;
    } catch (e) {
      await this.afterThrow(ctx, e as Error);
      throw e;
    } finally {
      await this.afterFinally(ctx);
    }
  }

  async beforeCall(ctx: InternalAdviceContext): Promise<void> {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice = ctx.that[aspectAdvice.name];
      if (advice.beforeCall) {
        /**
         * 这里...写法使传入的参数变成了一个新的对象
         * 因此beforeCall里面如果修改了ctx.args
         * 最新的args是不会在方法里生效的
         * 先保证args可以生效
         * 不改动其余地方
         */
        const fnCtx = ctx.createCallContext(aspectAdvice.adviceParams);
        await advice.beforeCall(fnCtx);
        ctx.args = fnCtx.args;
      }
    }
  }

  async afterReturn(ctx: InternalAdviceContext, result: any): Promise<void> {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice = ctx.that[aspectAdvice.name];
      if (advice.afterReturn) {
        const fnCtx = ctx.createCallContext(aspectAdvice.adviceParams);
        await advice.afterReturn(fnCtx, result);
      }
    }
  }

  async afterThrow(ctx: InternalAdviceContext, error: Error): Promise<void> {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice = ctx.that[aspectAdvice.name];
      if (advice.afterThrow) {
        const fnCtx = ctx.createCallContext(aspectAdvice.adviceParams);
        await advice.afterThrow(fnCtx, error);
      }
    }
  }

  async afterFinally(ctx: InternalAdviceContext): Promise<void> {
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice = ctx.that[aspectAdvice.name];
      if (advice.afterFinally) {
        const fnCtx = ctx.createCallContext(aspectAdvice.adviceParams);
        await advice.afterFinally(fnCtx);
      }
    }
  }

  async doExecute(ctx: InternalAdviceContext): Promise<unknown> {
    const lastCall = () => {
      const originMethod = Object.getPrototypeOf(this.obj)[this.method];
      return Reflect.apply(originMethod, ctx.that, ctx.args);
    };
    const functions: Array<Middleware<InternalAdviceContext>> = [];
    for (const aspectAdvice of this.aspectAdviceList) {
      const advice = ctx.that[aspectAdvice.name];
      const fn = advice.around;
      if (fn) {
        functions.push(async (ctx: InternalAdviceContext, next: () => Promise<any>) => {
          const fnCtx = ctx.createCallContext(aspectAdvice.adviceParams);
          return await fn.call(advice, fnCtx, next);
        });
      }
    }
    functions.push(lastCall);
    return compose(functions)(ctx);
  }
}
