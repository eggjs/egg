import '@eggjs/tegg-plugin/types';
import type { EventBus, EventWaiter } from '@eggjs/eventbus-decorator';

import type { EggContextEventBus } from './lib/EggContextEventBus.ts';

declare module 'egg' {
  interface Application {
    /**
     * Get the event bus, only for unittest
     */
    getEventbus(): Promise<EventBus>;
    /**
     * Get the event waiter, only for unittest
     */
    getEventWaiter(): Promise<EventWaiter>;
  }

  interface Context {
    get eventBus(): EggContextEventBus;
  }
}
