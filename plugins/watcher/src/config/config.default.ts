import type { BaseEventSource } from '../lib/event-sources/base.ts';
import DefaultEventSource from '../lib/event-sources/default.ts';
import DevelopmentEventSource from '../lib/event-sources/development.ts';

export interface WatcherConfig {
  /**
   * event source type, default is `default`
   * can be `default` or `development`
   */
  type: string;
  /**
   * event sources
   * key is event source type, value is string (module path) or event source class
   */
  eventSources: Record<string, string | typeof BaseEventSource>;
}

export default {
  /**
   * watcher options
   * @member Config#watcher
   * @property {string} type - event source type
   */
  watcher: {
    type: 'default', // default event source
    eventSources: {
      default: DefaultEventSource,
      development: DevelopmentEventSource,
    },
  } as WatcherConfig,
};
