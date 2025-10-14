import { Context } from 'egg';

import type { Tracer } from '../../lib/tracer.ts';

const TRACER: unique symbol = Symbol('context tracer');

export default class TracerContext extends Context {
  get tracer(): Tracer {
    if (!this[TRACER]) {
      this[TRACER] = new this.app.config.tracer.Class(this);
    }
    return this[TRACER] as Tracer;
  }

  get traceId(): string {
    return this.tracer.traceId;
  }
}
