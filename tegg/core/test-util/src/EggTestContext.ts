import { IdenticalUtil } from '@eggjs/lifecycle';
import { AbstractEggContext, ContextHandler } from '@eggjs/tegg-runtime';

import { mock } from './mock_compat.ts';

const EGG_CTX = Symbol('TEgg#context');

export interface Tracer {
  readonly traceId: string;
}

export class EggTestContext extends AbstractEggContext {
  data: Map<string | symbol, any> = new Map();
  readonly id: string;

  constructor() {
    super();
    const mockCtx = {
      tracer: {
        traceId: 'mock-traceId',
      },
    };
    this.id = IdenticalUtil.createContextId();
    this.set(EGG_CTX, mockCtx);
    mock.method(ContextHandler, 'getContext', () => {
      return this;
    });
  }

  static async mockContext<R>(cb: (ctx: EggTestContext) => Promise<R>): Promise<R> {
    const ctx = new EggTestContext();
    return await ContextHandler.run(ctx, () => {
      return cb(ctx);
    });
  }
}
