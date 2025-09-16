import type {
  OnerrorConfig,
} from './config/config.default.ts';

export type { OnerrorConfig };

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    onerror: OnerrorConfig;
  }
}
