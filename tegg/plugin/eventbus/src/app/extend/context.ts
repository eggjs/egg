import { Context } from 'egg';

import { EggContextEventBus } from '../../lib/EggContextEventBus.ts';

const EVENT_BUS = Symbol.for('context#eventBus');

export default class EventBusContext extends Context {
  get eventBus(): EggContextEventBus {
    if (!this[EVENT_BUS]) {
      this[EVENT_BUS] = new EggContextEventBus(this);
    }
    return this[EVENT_BUS] as EggContextEventBus;
  }
}
