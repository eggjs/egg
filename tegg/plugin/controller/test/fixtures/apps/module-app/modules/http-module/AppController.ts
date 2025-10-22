import type { Context } from 'egg';
import { HTTPContext, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPParam } from '@eggjs/tegg';

@HTTPController()
export class AppController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/apps/:id',
  })
  async get(
    @HTTPContext() ctx: Context,
    @HTTPParam() id: string,
  ): Promise<{
    traceId: string;
    app: string;
  }> {
    const traceId = ctx.tracer.traceId;
    return {
      traceId,
      app: 'mock-app:' + id,
    };
  }
}
