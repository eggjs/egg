import type { OnerrorConfig } from './config/config.default.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    onerror: OnerrorConfig;
  }
}
