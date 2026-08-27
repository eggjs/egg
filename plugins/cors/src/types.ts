import type { CorsConfig } from './config/config.default.ts';

declare module 'egg' {
  interface EggAppConfig {
    cors: CorsConfig;
  }
}
