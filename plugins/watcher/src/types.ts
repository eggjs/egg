import type { WatcherConfig } from './config/config.default.ts';
import type { Watcher } from './lib/watcher.ts';

declare module 'egg' {
  interface EggApplicationCore {
    watcher: Watcher;
  }

  interface EggAppConfig {
    watcher?: WatcherConfig;
  }
}
