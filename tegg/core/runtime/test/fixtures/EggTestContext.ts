import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { AbstractEggContext } from '../../src/index.js';

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
  }
}
