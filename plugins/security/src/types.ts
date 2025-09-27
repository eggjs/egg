// for types of extend files
import './app/extend/application.ts';
import './app/extend/context.ts';
import './app/extend/response.ts';
import type { SecurityConfig, SecurityHelperConfig } from './config/config.default.ts';

export type * from './config/config.default.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    security: SecurityConfig;
    helper: SecurityHelperConfig;
  }
}
