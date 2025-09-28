import path from 'node:path';

import { defineConfigFactory, type PartialEggConfig } from 'egg';

import type { Options as StaticCacheOptions } from '@eggjs/koa-static-cache';

export interface StaticDirOptions extends Omit<StaticCacheOptions, 'dir'> {
  /**
   * static files store dir
   */
  dir: string;
  /**
   * static files prefix
   * Default to `'/public/'`
   */
  prefix: string;
  /**
   * cache max age in `seconds`
   * Default to `0` on development, `31536000` on production
   */
  maxAge: number;
  /**
   * dynamic load file which not cached on initialization
   * Default to `true`
   */
  dynamic: boolean;
  /**
   * caches the assets on initialization or not,
   * always work together with `options.dynamic`
   * Default to `false`
   */
  preload: boolean;
  /**
   * buffer the file content or not
   * Default to `false` on development, `true` on production
   */
  buffer: boolean;
  /**
   * max files count in store
   * Default to `1000`
   */
  maxFiles: number;
}

export interface StaticConfig extends Omit<StaticDirOptions, 'dir'> {
  /**
   * static files store dir
   * Default to `${baseDir}/app/public`
   */
  dir: string | Array<string | StaticDirOptions>;
  /**
   * static files store dirs
   * @deprecated use `dir` instead
   */
  dirs?: Array<string | StaticDirOptions>;
}

export default defineConfigFactory((appInfo): PartialEggConfig => {
  return {
    static: {
      prefix: '/public/',
      dir: path.join(appInfo.baseDir, 'app/public'),
      // dirs: [ dir1, dir2 ] or [ dir1, { prefix: '/static2', dir: dir2 } ],
      // support lazy load
      dynamic: true,
      preload: false,
      buffer: false,
      maxFiles: 1000,
    },
  };
});
