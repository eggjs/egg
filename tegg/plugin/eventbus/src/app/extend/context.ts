import { Context } from 'egg';

import { EggContextEventBus } from '../../lib/EggContextEventBus.ts';

const EVENT_BUS = Symbol.for('context#eventBus');

export default class EventBusContext extends Context {
  [EVENT_BUS]: EggContextEventBus;

  get eventBus() {
    if (!this[EVENT_BUS]) {
      this[EVENT_BUS] = new EggContextEventBus(this);
    }
    return this[EVENT_BUS];
  }
}

declare module 'egg' {
  interface Context {
    get eventBus(): EggContextEventBus;
  }
}
