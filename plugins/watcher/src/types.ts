import type { Watcher } from './lib/watcher.ts';
import type { WatcherConfig } from './config/config.default.ts';

declare module 'egg' {
  interface EggApplicationCore {
    watcher: Watcher;
  }

  interface EggAppConfig {
    watcher?: WatcherConfig;
  }
}
