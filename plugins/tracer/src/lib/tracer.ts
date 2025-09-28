import { randomUUID } from 'node:crypto';
import type { Context } from 'egg';

export class Tracer {
  readonly ctx: Context;
  #traceId: string | undefined;

  constructor(ctx: Context) {
    this.ctx = ctx;
  }

  get traceId() {
    if (!this.#traceId) {
      this.#traceId = randomUUID();
    }
    return this.#traceId;
  }
}
