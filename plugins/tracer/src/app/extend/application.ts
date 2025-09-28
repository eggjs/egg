import { EggCore } from 'egg';
import type { Tracer } from '../../lib/tracer.js';

const cacheTracer = Symbol('before_ready_tracer');
export const isReady = Symbol('egg_tracer_is_ready');

export default class TracerApplication extends EggCore {
  [cacheTracer]: Tracer | undefined;

  get tracer(): Tracer {
    if (this[isReady]) {
      return new this.config.tracer.Class(this.createAnonymousContext());
    }

    if (!this[cacheTracer]) {
      this[cacheTracer] = new this.config.tracer.Class(this.createAnonymousContext());
    }

    return this[cacheTracer];
  }
}

declare module 'egg' {
  interface EggCore {
    tracer: Tracer;
  }
}
