import type { StatusConfig } from './config/config.default.ts';

declare module 'egg' {
  interface EggAppConfig {
    /** Health check middleware options. */
    status?: StatusConfig;
  }
}
