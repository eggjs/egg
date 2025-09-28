import path from 'node:path';

import { defineConfigFactory } from 'egg';

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

export default defineConfigFactory(appInfo => ({
  view: {
    root: path.join(appInfo.baseDir, 'app/view'),
    cache: true,
    defaultExtension: '.html',
    defaultViewEngine: '',
    mapping: {},
  },
}));
