import type { NunjucksConfig } from './config/config.default.ts';
import type { NunjucksEnvironment } from './lib/environment.ts';

declare module 'egg' {
  // Extend EggAppConfig with nunjucks configuration
  interface EggAppConfig {
    nunjucks: NunjucksConfig;
  }

  // Extend Application with nunjucks environment
  interface Application {
    /**
     * Nunjucks environment instance
     * @see https://mozilla.github.io/nunjucks/api.html#environment
     */
    get nunjucks(): NunjucksEnvironment;
  }
}
