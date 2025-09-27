import './app/extend/application.js';
import './app/extend/context.js';
import type { SecurityConfig, SecurityHelperConfig } from './config/config.default.js';

export type * from './config/config.default.js';

declare module '@eggjs/core' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    security: SecurityConfig;
    helper: SecurityHelperConfig;
  }
}
