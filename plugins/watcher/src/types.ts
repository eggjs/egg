import type { Watcher } from './lib/watcher.ts';
import type { WatcherConfig } from './config/config.default.ts';

declare module 'egg' {
  interface Application {
    watcher: Watcher;
  }

  interface Agent {
    watcher: Watcher;
  }

  interface EggAppConfig {
    watcher?: WatcherConfig;
  }
}
