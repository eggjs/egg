import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import type { Next, ContextDelegation } from '../../lib/egg.js';

export type SiteFileContentFun = (ctx: ContextDelegation) => Promise<Buffer | string>;

export interface SiteFileMiddlewareOptions {
  enable: boolean;
  cacheControl: string;
  [key: string]: string | Buffer | boolean | SiteFileContentFun | URL;
}

const BUFFER_CACHE = Symbol('siteFile URL buffer cache');

module.exports = (options: SiteFileMiddlewareOptions) => {
  return async function siteFile(ctx: ContextDelegation, next: Next) {
    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') {
      return next();
    }
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

    // URL
    if (content instanceof URL) {
      if (content.protocol !== 'file:') {
        return ctx.redirect(content.href);
      }
      // protocol = file:
      let buffer = Reflect.get(content, BUFFER_CACHE) as Buffer;
      if (!buffer) {
        buffer = await readFile(fileURLToPath(content));
        Reflect.set(content, BUFFER_CACHE, buffer);
      }
      ctx.set('cache-control', options.cacheControl);
      ctx.body = content;
      ctx.type = path.extname(ctx.path);
      return;
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
