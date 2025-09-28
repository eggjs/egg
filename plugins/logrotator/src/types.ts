import type { LogrotatorConfig } from './config/config.default.ts';
import type { LogRotator } from './lib/rotator.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    /**
     * logrotator options
     * @member Config#logrotator
     */
    logrotator: LogrotatorConfig;
  }

  interface Agent {
    LogRotator: typeof LogRotator;
  }

  interface Application {
    LogRotator: typeof LogRotator;
  }
}
