import type { Context } from 'egg';
import { HTTPRequest as BaseHTTPRequest } from '@eggjs/tegg';

export class HTTPRequest extends BaseHTTPRequest {
  constructor(ctx: Context) {
    const request = ctx.request;
    // href: https://github.com/eggjs/koa/blob/master/src/request.ts#L90C1-L98C4
    super(request.href, {
      method: request.method,
      headers: request.headers as unknown as HeadersInit,
      body: (ctx.request as any).rawBody,
    });
  }
}
