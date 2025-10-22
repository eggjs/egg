import type { Context } from 'egg';

import { EggContextEventBus } from '../../lib/EggContextEventBus.ts';

const EVENT_BUS = Symbol.for('context#eventBus');

export default class EventBusContext {
  get eventBus(): EggContextEventBus {
    const ctx = this as unknown as Context;
    if (!ctx[EVENT_BUS]) {
      ctx[EVENT_BUS] = new EggContextEventBus(ctx);
    }
    return ctx[EVENT_BUS] as EggContextEventBus;
  }
}
