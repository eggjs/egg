import { IdenticalUtil } from '@eggjs/lifecycle';
import { EGG_CONTEXT, TEGG_CONTEXT } from '@eggjs/module-common';
import { AbstractEggContext } from '@eggjs/tegg-runtime';
import type { Context } from 'egg';

// TEggContext 的实现
export class EggContextImpl extends AbstractEggContext {
  readonly id: string;

  constructor(ctx: Context) {
    super();
    this.set(EGG_CONTEXT, ctx);
    ctx[TEGG_CONTEXT] = this;
    const tracer = ctx.tracer as { traceId: string } | undefined;
    this.id = IdenticalUtil.createContextId(tracer?.traceId);
  }
}
