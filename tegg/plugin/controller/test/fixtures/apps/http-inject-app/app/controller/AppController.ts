import {
  HTTPContext,
  type EggContext,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Middleware,
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
  async testRequest(
    @HTTPContext() ctx: EggContext,
    @HTTPRequest() request: Request,
    @HTTPCookies() cookies: Cookies,
  ): Promise<{
    success: boolean;
    traceId: string;
    headers: Record<string, string>;
    method: string;
    requestBody: string;
    cookies: string | undefined;
  }> {
    const traceId = await ctx.tracer.traceId;
    return {
      success: true,
      traceId,
      headers: Object.fromEntries(request.headers),
      method: request.method,
      requestBody: await request.text(),
      cookies: cookies.get('test', { signed: false }),
    };
  }
}
