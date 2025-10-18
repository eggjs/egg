import assert from 'node:assert';

import type { EggRuntimeContext } from '@eggjs/tegg-types';

type runInContextCallback<R = any> = (context: EggRuntimeContext, fn: () => Promise<R>) => Promise<R>;

export class ContextHandler {
  static getContextCallback: () => EggRuntimeContext | undefined;
  static runInContextCallback: runInContextCallback;

  static getContext(): EggRuntimeContext | undefined {
    assert(this.getContextCallback, 'getContextCallback not set');
    return this.getContextCallback ? this.getContextCallback() : undefined;
  }

  static run<R = any>(context: EggRuntimeContext, fn: () => Promise<R>): Promise<R> {
    assert(this.runInContextCallback, 'runInContextCallback not set');
    return this.runInContextCallback(context, fn);
  }
}
