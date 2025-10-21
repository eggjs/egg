import type { Context } from 'egg';

export function initRequest(ctx: Context): Request {
  // href: https://github.com/eggjs/egg/blob/next/packages/koa/src/request.ts#L90C1-L98C4
  return new Request(ctx.request.href, {
    method: ctx.request.method,
    // @ts-expect-error Type 'IncomingHttpHeaders' is not assignable to type 'HeadersInit | undefined'
    headers: ctx.request.headers,
    // @ts-expect-error should export from ctx.request
    // oxlint-disable-next-line no-invalid-fetch-options
    body: ctx.request.rawBody,
  });
}
