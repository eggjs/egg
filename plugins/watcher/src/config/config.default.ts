import path from 'node:path';

export interface WatcherConfig {
  /**
   * event source type, default is `default`
   * can be `default` or `development`
   */
  type: string;
  /**
   * event sources
   * key is event source type, value is event source module path
   */
  eventSources: Record<string, string>;
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
      default: path.join(import.meta.dirname, '../lib/event-sources/default'),
      development: path.join(import.meta.dirname, '../lib/event-sources/development'),
    },
  } as WatcherConfig,
};
