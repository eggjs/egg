import type { LogrotatorConfig } from './config/config.default.js';
import type { LogRotator } from './lib/rotator.js';

export type { LogrotatorConfig };

declare module '@eggjs/core' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    logrotator: LogrotatorConfig;
  }

  interface EggCore {
    LogRotator: typeof LogRotator;
  }
}
