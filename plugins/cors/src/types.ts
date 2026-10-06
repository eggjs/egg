import type { CorsConfig } from './config/config.default.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    /**
     * cors options
     * @member Config#cors
     * @see https://github.com/koajs/cors#corsoptions
     */
    cors?: CorsConfig;
  }
}
