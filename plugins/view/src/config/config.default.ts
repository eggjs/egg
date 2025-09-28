import path from 'node:path';
import type { EggAppInfo } from '@eggjs/core';

/**
 * view default config
 * @member Config#view
 * @property {String} [root=${baseDir}/app/view] - give a path to find the file, you can specify multiple path with `,` delimiter
 * @property {Boolean} [cache=true] - whether cache the file's path
 * @property {String} [defaultExtension] - defaultExtension can be added automatically when there is no extension  when call `ctx.render`
 * @property {String} [defaultViewEngine] - set the default view engine if you don't want specify the viewEngine every request.
 * @property {Object} mapping - map the file extension to view engine, such as `{ '.ejs': 'ejs' }`
 */
export interface ViewConfig {
  /**
   * give a path to find the file, you can specify multiple path with `,` delimiter
   * Default is `${baseDir}/app/view`
   */
  root: string;
  /**
   * whether cache the file's path
   * Default is `true`
   */
  cache: boolean;
  /**
   * defaultExtension can be added automatically when there is no extension  when call `ctx.render`
   * Default is `.html`
   */
  defaultExtension: string;
  /**
   * set the default view engine if you don't want specify the viewEngine every request.
   * Default is `''`
   */
  defaultViewEngine: string;
  /**
   * map the file extension to view engine, such as `{ '.ejs': 'ejs' }`
   * Default is `{}`
   */
  mapping: Record<string, string>;
}

export default (appInfo: EggAppInfo) => ({
  view: {
    root: path.join(appInfo.baseDir, 'app/view'),
    cache: true,
    defaultExtension: '.html',
    defaultViewEngine: '',
    mapping: {},
  },
});

declare module '@eggjs/core' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    view: ViewConfig;
  }
}
