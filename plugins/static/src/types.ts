import type { StaticConfig } from './config/config.default.ts';

declare module 'egg' {
  /**
   * Static file serve
   * @member Config#static
   * @see https://github.com/eggjs/egg/tree/next/packages/koa-static-cache
   */
  interface EggAppConfig {
    static: StaticConfig;
  }
}
