import { Context as EggContext } from 'egg';
import {
  Context,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Middleware,
  Request,
  HTTPRequest,
  Cookies,
  HTTPCookies,
} from '@eggjs/tegg';
import { countMw } from '../middleware/count_mw.ts';

@HTTPController({
  path: '/apps',
})
@Middleware(countMw)
export class AppController {
  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/testRequest',
  })
  async testRequest(@Context() ctx: EggContext, @Request() request: HTTPRequest, @Cookies() cookies: HTTPCookies) {
    const traceId = await ctx.tracer.traceId;
    return {
      success: true,
      traceId,
      // @ts-expect-error HTTPRequest is not a real Request
      headers: Object.fromEntries(request.headers),
      // @ts-expect-error HTTPRequest is not a real Request
      method: request.method,
      // @ts-expect-error HTTPRequest is not a real Request
      requestBody: await request.text(),
      cookies: cookies.get('test', { signed: false }),
    };
  }
}
