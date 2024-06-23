import path from 'node:path';
import type { EggCoreContext } from '@eggjs/core';
import type { Next } from '../../lib/type.js';

export type SiteFileContentFun = (ctx: EggCoreContext) => Promise<Buffer | string>;

export interface SiteFileMiddlewareOptions {
  enable: boolean;
  cacheControl: string;
  [key: string]: string | Buffer | boolean | SiteFileContentFun;
}

module.exports = (options: SiteFileMiddlewareOptions) => {
  return async function siteFile(ctx: EggCoreContext, next: Next) {
    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') {
      return next();
    }
    /* istanbul ignore if */
    if (ctx.path[0] !== '/') {
      return next();
    }

    let content = options[ctx.path];
    if (!content) {
      return next();
    }

    // '/favicon.ico': 'https://eggjs.org/favicon.ico' or '/favicon.ico': async (ctx) => 'https://eggjs.org/favicon.ico'
    // content is function
    if (typeof content === 'function') {
      content = await content(ctx);
    }
    // content is url
    if (typeof content === 'string') {
      return ctx.redirect(content);
    }

    // '/robots.txt': Buffer <xx..
    // content is buffer
    if (Buffer.isBuffer(content)) {
      ctx.set('cache-control', options.cacheControl);
      ctx.body = content;
      ctx.type = path.extname(ctx.path);
      return;
    }

    return next();
  };
};
