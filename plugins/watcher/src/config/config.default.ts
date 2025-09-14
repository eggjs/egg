import path from 'node:path';
import { getSourceDirname } from '../lib/utils.js';
import type { WatcherConfig } from '../lib/types.js';

export default {
  /**
   * watcher options
   * @member Config#watcher
   * @property {string} type - event source type
   */
  watcher: {
    type: 'default', // default event source
    eventSources: {
      default: path.join(getSourceDirname(), 'lib', 'event-sources', 'default'),
      development: path.join(
        getSourceDirname(),
        'lib',
        'event-sources',
        'development'
      ),
    },
  } as WatcherConfig,
};
