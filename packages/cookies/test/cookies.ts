import { EventEmitter } from 'node:events';

import { Cookies, type DefaultCookieOptions } from '../src/index.ts';

export default function createCookie(
  req?: any,
  options?: { keys?: string[] | null; secure?: boolean } | null,
  defaultCookieOptions?: DefaultCookieOptions
) {
  options = options || {};
  let keys = options.keys;
  keys = keys === undefined ? ['key', 'keys'] : keys;
  const ctx: Record<string, any> = {
    secure: options.secure,
    app: new EventEmitter(),
  };
  ctx.request = {
    headers: {},
    get(key: string) {
      return this.headers[key];
    },
    ...req,
  };

  ctx.response = {
    headers: {},
    get(key: string) {
      return this.headers[key];
    },
    set(key: string, value: string) {
      this.headers[key] = value;
    },
  };

  ctx.get = ctx.request.get.bind(ctx.request);
  ctx.set = ctx.response.set.bind(ctx.response);

  return new Cookies(ctx, keys as any, defaultCookieOptions);
}
